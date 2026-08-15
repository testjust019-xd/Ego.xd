const fs = require('fs');
const path = require('path');
const config = require('../config');

const PREFS_PATH = path.join(__dirname, '..', 'data', 'modelPrefs.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(PREFS_PATH, 'utf-8'));
  } catch {
    return { global: {}, users: {} };
  }
}

function save(data) {
  fs.mkdirSync(path.dirname(PREFS_PATH), { recursive: true });
  fs.writeFileSync(PREFS_PATH, JSON.stringify(data, null, 2));
}

/**
 * provider: 'openRouter' | 'groq' | 'huggingFace'
 * scope: 'global' or user jid
 */
function getModel(provider, userJid = null) {
  const data = load();
  if (userJid && data.users[userJid]?.[provider]) {
    return data.users[userJid][provider];
  }
  if (data.global[provider]) return data.global[provider];
  // fallback config
  if (provider === 'openRouter') return config.openRouter?.model;
  if (provider === 'groq') return config.groq?.model;
  if (provider === 'huggingFace') return config.huggingFace?.model;
  if (provider === 'gemini') return config.gemini?.model;
  return null;
}

function setModel(provider, model, userJid = null) {
  const data = load();
  if (userJid) {
    if (!data.users[userJid]) data.users[userJid] = {};
    data.users[userJid][provider] = model;
  } else {
    data.global[provider] = model;
  }
  save(data);
  return model;
}

function listPrefs(userJid = null) {
  const data = load();
  return {
    global: data.global || {},
    user: (userJid && data.users[userJid]) || {}
  };
}

module.exports = { getModel, setModel, listPrefs };
