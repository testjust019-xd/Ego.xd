/**
 * EGO.XD-Baron — connexion principale
 * Utilise baron-baileys-v2 (anti-ban agressif activé par défaut)
 */
require('dotenv').config();

// Empêche un crash total si Baileys lève une rejection non gérée
// (ex: "Invalid content type", key-index-list "illegal buffer")
process.on('unhandledRejection', (reason) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  if (/No session found to decrypt|illegal buffer|Invalid content type|old counter/i.test(msg)) return;
  console.error('[unhandledRejection]', msg);
});
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message);
});


const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage
} = require('baron-baileys-v2');
const { Boom } = require('@hapi/boom');
const path = require('path');
const qrcode = require('qrcode-terminal');

const config = require('./config');
// Préfixe runtime (persisté via .setprefix)
try {
  const _fs = require('fs');
  const _sp = require('path').join(__dirname, 'data', 'settings.json');
  if (_fs.existsSync(_sp)) {
    const _s = JSON.parse(_fs.readFileSync(_sp, 'utf-8'));
    if (_s.prefix) config.prefix = _s.prefix;
    if (_s.activeTheme) { /* themeManager lit settings lui-même */ }
  }
} catch (_) {}

const { loadCommands } = require('./lib/commandLoader');
const { attachMessageHandler } = require('./lib/messageHandler');
const { setCommandRouter } = require('./lib/sessionManager');

// Expose downloadMediaMessage for other modules that still import from baileys
global.__baronDownloadMediaMessage = downloadMediaMessage;

const commands = loadCommands(path.join(__dirname, 'commands'));
console.log(`✅ ${commands.size} commande(s) chargée(s).`);

setCommandRouter(commands, attachMessageHandler);

async function startBot() {
  const fs = require('fs');
  const sessionRoot = require('path').resolve(process.cwd(), config.sessionDir || process.env.SESSION_DIR || 'sessions');
  fs.mkdirSync(sessionRoot, { recursive: true });
  const mainSessionPath = require('path').join(sessionRoot, 'main');
  const { state, saveCreds } = await useMultiFileAuthState(mainSessionPath);
  console.log('[bot] session dir:', mainSessionPath);

  // ─── Socket Baron avec TOUT le système anti-ban ───
  const pino = require('pino');
  const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'error' });

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    logger: baileysLogger,
    // antiban: ne rien passer = preset "aggressive" (défaut Baron)
    // Options possibles : { preset: 'moderate' | 'conservative' | 'aggressive' }
    // ou antiban: false pour désactiver
    antiban: config.antiban || { preset: 'aggressive' },
    // Autres options utiles
    syncFullHistory: false,
    generateHighQualityLinkPreview: false
  });

  if (config.pairing?.enabled && !sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.pairing.phoneNumber);
        console.log(`\n📌 Code d'appairage : ${code}\n`);
        console.log('Va dans WhatsApp > Appareils liés > Lier avec un numéro > entre ce code.');
      } catch (err) {
        console.error("Erreur génération code d'appairage:", err.message);
      }
    }, 3000);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && !config.pairing?.enabled) {
  // Ancien QR terminal (utile en local)
  qrcode.generate(qr, { small: true });

  // Lien d'image QR propre (parfait pour Render)
  const qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qr)}`;
  console.log('\n========================================');
  console.log('📱  QR CODE À SCANNER (clique sur le lien) :');
  console.log(qrLink);
  console.log('========================================\n');
}

    if (connection === 'close') {
      const status = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = status !== DisconnectReason.loggedOut;
      console.log('Connexion fermée. Reconnexion :', shouldReconnect, status || '');
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${config.botName} (Baron) est connecté !`);
      try {
        const { setNotifyFn } = require('./helpers/gameWeb');
        setNotifyFn(async (jid, text) => {
          try { await sock.sendMessage(jid, { text }); } catch (_) {}
        });
      } catch (_) {}
      try {
        const gf = require('./lib/groupFactory');
        gf.setMainSock(sock);
        gf.startWorker();
        console.log('[groupFactory] sock principal lié + worker');
      } catch (e) {
        console.warn('[groupFactory]', e.message);
      }
      if (sock.antiban) {
        try {
          const stats = sock.antiban.getStats?.() || {};
          console.log('[antiban] actif — preset:', config.antiban?.preset || 'aggressive', stats);
        } catch (_) {}
      }
      try {
        const { startReminderPoller } = require('./lib/reminders');
        const { trackMessage } = require('./lib/messageTracker');
        if (!sock._remindersStarted) {
          sock._remindersStarted = true;
          startReminderPoller(async (jid, text) => {
            const sent = await sock.sendMessage(jid, { text });
            if (sent?.key) trackMessage(jid, sent.key);
          });
        }
      } catch (e) {
        // reminders optionnel
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
  attachMessageHandler(sock, commands);
}

startBot().catch((err) => {
  console.error('[startBot]', err);
  process.exit(1);
});
