const fs = require('fs');
const path = require('path');
const config = require('../config');

const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'settings.json');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveSettings(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

function isPrivateOn() {
  const s = loadSettings();
  return !!s.privateMode;
}

function setPrivateMode(on) {
  const s = loadSettings();
  s.privateMode = !!on;
  if (!Array.isArray(s.privateVip)) s.privateVip = [];
  saveSettings(s);
  return s.privateMode;
}

function getPrivateVip() {
  const s = loadSettings();
  return Array.isArray(s.privateVip) ? s.privateVip : [];
}

function addPrivateVip(number) {
  const num = String(number).replace(/[^0-9]/g, '');
  if (!num || num.length < 8) return { ok: false, reason: 'numéro invalide' };
  const s = loadSettings();
  if (!Array.isArray(s.privateVip)) s.privateVip = [];
  if (s.privateVip.includes(num)) return { ok: false, reason: 'déjà présent', list: s.privateVip };
  s.privateVip.push(num);
  saveSettings(s);
  return { ok: true, list: s.privateVip };
}

function removePrivateVip(number) {
  const num = String(number).replace(/[^0-9]/g, '');
  const s = loadSettings();
  if (!Array.isArray(s.privateVip)) s.privateVip = [];
  const before = s.privateVip.length;
  s.privateVip = s.privateVip.filter((n) => n !== num);
  saveSettings(s);
  return { ok: s.privateVip.length < before, list: s.privateVip };
}

/**
 * True si le sender peut utiliser le bot quand private mode est ON.
 * Owner, staff, VIP, et fromMe passent toujours.
 */
function canUseBot(msg, sock) {
  if (!isPrivateOn()) return true;

  if (msg.key.fromMe) return true;

  const sender = (msg.key.participant || msg.key.remoteJid || '').replace(/[^0-9]/g, '');
  if (!sender) return false;

  if (config.ownerNumbers.includes(sender)) return true;
  if ((config.staffNumbers || []).includes(sender)) return true;

  const vip = getPrivateVip();
  if (vip.includes(sender)) return true;

  return false;
}

module.exports = {
  isPrivateOn,
  setPrivateMode,
  getPrivateVip,
  addPrivateVip,
  removePrivateVip,
  canUseBot
};
