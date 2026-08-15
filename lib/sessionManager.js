/**
 * Gestion multi-sessions (pairing web + .pair)
 * Adapté pour baron-baileys-v2
 *
 * Améliorations :
 * - sessionDir configurable (SESSION_DIR / config.sessionDir) pour VPS & disks Render
 * - mkdirSync explicite
 * - option force pour regénérer un code (supprime l'ancienne session)
 * - messages d'erreur plus clairs
 */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason
} = require('baron-baileys-v2');
const { Boom } = require('@hapi/boom');
const path = require('path');
const fs = require('fs');
const config = require('../config');

const activeSessions = new Map();

let commandsRef = null;
let attachHandlerFn = null;

function getSessionsRoot() {
  return path.resolve(process.cwd(), config.sessionDir || process.env.SESSION_DIR || 'sessions');
}

function sessionPath(name) {
  return path.join(getSessionsRoot(), name);
}

function setCommandRouter(commands, attachMessageHandler) {
  commandsRef = commands;
  attachHandlerFn = attachMessageHandler;
}

/**
 * Crée une session WhatsApp (comme .pair).
 * @param {string} name - nom de session (ex: web_2250..., perso)
 * @param {string} phoneNumber - numéro international chiffres seuls
 * @param {function} onPairingCode - callback(code|null, err|null)
 * @param {{ force?: boolean }} options - force=true efface l'ancienne session
 */
async function createSession(name, phoneNumber, onPairingCode, options = {}) {
  const root = getSessionsRoot();
  fs.mkdirSync(root, { recursive: true });

  const sessionDir = sessionPath(name);
  const force = !!(options && options.force);

  if (force && fs.existsSync(sessionDir)) {
    try {
      const sockOld = activeSessions.get(name);
      if (sockOld) {
        try { await sockOld.logout(); } catch (_) {}
        activeSessions.delete(name);
      }
      fs.rmSync(sessionDir, { recursive: true, force: true });
      console.log(`[session:${name}] force=true → ancien dossier supprimé`);
    } catch (e) {
      console.warn(`[session:${name}] force cleanup:`, e.message);
    }
  }

  const existing = activeSessions.get(name);
  if (existing?.user) {
    if (typeof onPairingCode === 'function') {
      onPairingCode(null, new Error('Cette session est déjà connectée. Utilise .unpair d\'abord ou force=true.'));
    }
    return existing;
  }

  const credsPath = path.join(sessionDir, 'creds.json');
  if (fs.existsSync(credsPath) && !force) {
    try {
      const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      if (creds?.registered) {
        if (typeof onPairingCode === 'function') {
          onPairingCode(
            null,
            new Error(
              'Ce numéro a déjà une session enregistrée. ' +
                'Utilise force=true (page web) ou .unpair, ou supprime le dossier ' +
                sessionDir
            )
          );
        }
        return null;
      }
    } catch (_) {}
  }

  fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    antiban: config.antiban || { preset: 'aggressive' },
    syncFullHistory: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const status = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconnect = status !== DisconnectReason.loggedOut;
      console.log(`[session:${name}] fermée. Reconnexion :`, shouldReconnect, status || '');
      activeSessions.delete(name);
      if (shouldReconnect) {
        setTimeout(() => createSession(name, phoneNumber, null), 2000);
      }
    } else if (connection === 'open') {
      console.log(`✅ Session "${name}" connectée ! (Baron antiban) · dir=${sessionDir}`);
    }
  });

  if (attachHandlerFn && commandsRef) {
    attachHandlerFn(sock, commandsRef);
    console.log(`[session:${name}] routeur de commandes attaché.`);
  } else {
    console.warn(`[session:${name}] routeur non disponible — commandes non routées.`);
  }

  activeSessions.set(name, sock);

  if (!sock.authState.creds.registered && phoneNumber && typeof onPairingCode === 'function') {
    const waitMs = 3000;
    const timeoutMs = 28000;
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      onPairingCode(null, new Error('Délai dépassé en générant le code (WhatsApp lent ou IP cloud bloquée). Réessaie dans 30–60s.'));
    }, timeoutMs);

    setTimeout(async () => {
      try {
        const clean = String(phoneNumber).replace(/\D/g, '');
        if (!clean || clean.length < 8) {
          throw new Error('Numéro invalide pour requestPairingCode');
        }
        const code = await sock.requestPairingCode(clean);
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.log(`[session:${name}] code généré pour ${clean}`);
        onPairingCode(code, null);
      } catch (err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const msg = err?.message || String(err);
        console.error(`[session:${name}] requestPairingCode:`, msg);
        onPairingCode(null, new Error(msg || 'Échec génération code pairing'));
      }
    }, waitMs);
  }

  return sock;
}

function getSession(name) {
  return activeSessions.get(name) || null;
}

function listSessions() {
  return [...activeSessions.keys()];
}

async function destroySession(name) {
  const sock = activeSessions.get(name);
  if (sock) {
    try {
      await sock.logout();
    } catch (_) {}
    activeSessions.delete(name);
  }
  const sessionDir = sessionPath(name);
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  }
}

module.exports = {
  createSession,
  getSession,
  listSessions,
  destroySession,
  setCommandRouter,
  activeSessions,
  getSessionsRoot,
  sessionPath
};
