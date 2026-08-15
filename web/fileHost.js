/**
 * fileHost.js — routes "MediaFire-like" : upload un fichier, on le planque
 * sur Telegram, on renvoie un lien /f/:id. Le visiteur ne voit jamais
 * Telegram, juste notre domaine.
 *
 * Monté depuis start.js :
 *   require('./web/fileHost').register(app);
 */
const multer = require('multer');
const path = require('path');
const rateLimit = require('../lib/rateLimit');
const telegramStorage = require('../lib/telegramStorage');
const fileStore = require('../lib/fileStore');

// Upload gardé en RAM (pas écrit sur disque) puis relayé tel quel vers
// Telegram — évite d'avoir à gérer/nettoyer des fichiers temporaires.
// La limite réelle (config.telegramStorage.maxUploadMB) est revérifiée
// dans telegramStorage.uploadBuffer ; celle-ci n'est qu'un garde-fou large
// pour éviter qu'un upload énorme sature la RAM avant même cette vérif.
const HARD_CAP_MB = parseInt(process.env.TG_HARD_CAP_MB || '2048', 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: HARD_CAP_MB * 1024 * 1024, files: 1 }
});

function register(app) {
  app.post('/api/files/upload', (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    // 10 uploads / 10 min par IP — évite qu'un script arrose Telegram de requêtes.
    const rl = rateLimit.check(`upload:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return res.status(429).json({ error: `Trop d'uploads. Réessaie dans ${rl.waitSec}s.` });
    }

    upload.single('file')(req, res, async (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
          ? `Fichier trop volumineux (max ${HARD_CAP_MB}MB).`
          : err.message;
        return res.status(400).json({ error: msg });
      }
      if (!req.file) return res.status(400).json({ error: 'Aucun fichier reçu (champ "file" attendu).' });

      if (!telegramStorage.isConfigured()) {
        return res.status(503).json({
          error: "Stockage Telegram non configuré côté serveur (TG_STORAGE_BOT_TOKEN / TG_STORAGE_CHAT_ID)."
        });
      }

      try {
        const filename = path.basename(req.file.originalname || 'fichier');
        const tg = await telegramStorage.uploadBuffer(req.file.buffer, filename, req.file.mimetype);
        const entry = fileStore.create({
          filename,
          mimetype: req.file.mimetype,
          size: tg.file_size || req.file.size,
          file_id: tg.file_id,
          message_id: tg.message_id
        });

        const base = process.env.PUBLIC_URL || require('../config').publicUrl || `${req.protocol}://${req.get('host')}`;
        res.json({
          id: entry.id,
          url: `${base.replace(/\/+$/, '')}/f/${entry.id}`,
          filename: entry.filename,
          size: entry.size
        });
      } catch (e) {
        res.status(502).json({ error: e.message || 'Échec upload.' });
      }
    });
  });

  // Page de destination (montre nom/taille + bouton téléchargement)
  app.get('/f/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'download.html'));
  });

  // Métadonnées (utilisées par download.html)
  app.get('/api/files/:id', (req, res) => {
    const entry = fileStore.get(req.params.id);
    if (!entry) return res.status(404).json({ error: 'Fichier introuvable ou expiré.' });
    res.json({
      id: entry.id,
      filename: entry.filename,
      size: entry.size,
      mimetype: entry.mimetype,
      downloads: entry.downloads,
      createdAt: entry.createdAt
    });
  });

  // Téléchargement effectif — on relaie les octets nous-mêmes, l'URL/le
  // token Telegram ne sont jamais exposés au client.
  app.get('/dl/:id', async (req, res) => {
    const entry = fileStore.get(req.params.id);
    if (!entry) return res.status(404).send('Fichier introuvable ou expiré.');

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const rl = rateLimit.check(`dl:${ip}`, 60, 10 * 60 * 1000);
    if (!rl.ok) return res.status(429).send(`Trop de téléchargements. Réessaie dans ${rl.waitSec}s.`);

    try {
      const upstream = await telegramStorage.openDownloadStream(entry.file_id);
      res.setHeader('Content-Type', entry.mimetype || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(entry.filename)}"`);
      if (entry.size) res.setHeader('Content-Length', entry.size);
      fileStore.registerDownload(entry.id);
      // Node 18+/22 : upstream.body est un ReadableStream Web — on le relaie tel quel.
      const { Readable } = require('stream');
      Readable.fromWeb(upstream.body).pipe(res);
    } catch (e) {
      res.status(502).send(e.message || 'Échec du téléchargement.');
    }
  });
}

module.exports = { register };
