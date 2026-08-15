const fs = require('fs');
const path = require('path');

/**
 * Médias auto par commande.
 *
 * Place tes fichiers dans assets/media/ avec le NOM de la commande :
 *   assets/media/ping.mp4
 *   assets/media/menu.png
 *   assets/media/welcome.mp3
 *   assets/media/antilink.jpg
 *
 * Compat menu : assets/menu/menu.png (etc.) est encore lu pour la commande "menu".
 *
 * Priorité d'envoi : audio (ambiance) → vidéo (légende) → image (légende) → texte seul.
 */

const ROOT = path.join(__dirname, '..');
const MEDIA_DIR = path.join(ROOT, 'assets', 'media');
const MENU_DIR = path.join(ROOT, 'assets', 'menu'); // legacy menu

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp'];
const VIDEO_EXTS = ['.mp4', '.webm', '.gif', '.mov'];
const AUDIO_EXTS = ['.mp3', '.ogg', '.m4a', '.opus', '.wav'];

function listFilesSafe(dir) {
  try {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Trouve image / video / audio pour un nom de commande (sans point, sans prefix).
 * @returns {{ image: string|null, video: string|null, audio: string|null }}
 */
function detectCommandMedia(cmdName) {
  const base = String(cmdName || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
  const found = { image: null, video: null, audio: null };
  if (!base) return found;

  const candidates = [];

  // 1) assets/media/<cmd>.ext
  for (const f of listFilesSafe(MEDIA_DIR)) {
    const lower = f.toLowerCase();
    const ext = path.extname(lower);
    const name = path.basename(lower, ext);
    if (name === base) candidates.push({ file: path.join(MEDIA_DIR, f), ext, name });
  }

  // 2) assets/media/<cmd>/media.ext ou n'importe quel fichier dans le sous-dossier
  const subDir = path.join(MEDIA_DIR, base);
  if (fs.existsSync(subDir) && fs.statSync(subDir).isDirectory()) {
    for (const f of listFilesSafe(subDir)) {
      const lower = f.toLowerCase();
      const ext = path.extname(lower);
      candidates.push({ file: path.join(subDir, f), ext, name: base });
    }
  }

  // 3) legacy assets/menu/ pour la commande menu
  if (base === 'menu') {
    for (const f of listFilesSafe(MENU_DIR)) {
      const lower = f.toLowerCase();
      const ext = path.extname(lower);
      const name = path.basename(lower, ext);
      if (name === 'menu') candidates.push({ file: path.join(MENU_DIR, f), ext, name });
    }
  }

  for (const c of candidates) {
    if (IMAGE_EXTS.includes(c.ext) && !found.image) found.image = c.file;
    else if (VIDEO_EXTS.includes(c.ext) && !found.video) found.video = c.file;
    else if (AUDIO_EXTS.includes(c.ext) && !found.audio) found.audio = c.file;
  }

  return found;
}

function hasAnyMedia(media) {
  return !!(media && (media.image || media.video || media.audio));
}

function audioMimetype(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ogg' || ext === '.opus') return 'audio/ogg; codecs=opus';
  if (ext === '.m4a') return 'audio/mp4';
  if (ext === '.wav') return 'audio/wav';
  return 'audio/mpeg';
}

module.exports = {
  MEDIA_DIR,
  MENU_DIR,
  detectCommandMedia,
  hasAnyMedia,
  audioMimetype
};
