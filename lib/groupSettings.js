const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'groupSettings.json');

const DEFAULTS = {
  antilink: false,
  antibot: false,
  blockedNumbers: [],
  welcome: false,
  goodbye: false,
  antidelete: false,
  autowarn: false,
  warnLimit: 3,
  bannedWords: [],
  welcomeText: '👋 Bienvenue @user dans *{group}* !\nOn est maintenant {count} membres.',
  goodbyeText: '👋 @user a quitté *{group}*.'
};

function loadAll() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveAll(data) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(data, null, 2));
}

function getGroupSettings(jid) {
  const all = loadAll();
  return { ...DEFAULTS, ...(all[jid] || {}) };
}

function setGroupSetting(jid, key, value) {
  const all = loadAll();
  all[jid] = { ...DEFAULTS, ...(all[jid] || {}), [key]: value };
  saveAll(all);
  return all[jid];
}

module.exports = { getGroupSettings, setGroupSetting, DEFAULTS };
