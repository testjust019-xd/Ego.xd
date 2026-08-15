const fs = require('fs');
const path = require('path');
const config = require('../config');

const DB_PATH = path.join(__dirname, '..', 'data', 'activated.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/** true si l'utilisateur a déjà activé le bot (une seule fois) */
function isActivated(jid) {
  const db = load();
  return !!db[jid];
}

function activate(jid) {
  const db = load();
  if (db[jid]) return false; // déjà activé
  db[jid] = { at: Date.now(), via: 'youtube' };
  save(db);
  return true;
}

function getActivationMessage() {
  const yt = config.youtube || {};
  const links = [];
  if (yt.devilskills) links.push(`🎬 *Devil Skills*\n${yt.devilskills}`);
  if (yt.soccervibe) links.push(`⚽ *Soccer Vibe*\n${yt.soccervibe}`);
  if (yt.falpy) links.push(`🎮 *Falpy Pro*\n${yt.falpy}`);
  if (!links.length) {
    links.push('https://www.youtube.com/@devilskills-e7c');
  }

  const prefix = config.prefix || '.';
  return (
    `╔══════════════════════════╗\n` +
    `║  🔓 *ACTIVATION REQUISE*  ║\n` +
    `╚══════════════════════════╝\n\n` +
    `Bienvenue chasseur.\n` +
    `Pour *activer le bot une seule fois* et débloquer les commandes, suis *au moins une* de mes chaînes YouTube :\n\n` +
    links.join('\n\n') +
    `\n\n` +
    `Une fois abonné(e), tape :\n` +
    `👉 *${prefix}activate*\n\n` +
    `_L'activation est permanente (1 seule fois)._\n` +
    `_Merci pour le soutien — ça aide énormément le projet 💜_`
  );
}

module.exports = {
  isActivated,
  activate,
  getActivationMessage
};
