const fs = require('fs');
const path = require('path');
const config = require('../config');

const SETTINGS_PATH = path.join(__dirname, '..', 'data', 'settings.json');

function loadSettings() {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return { activeTheme: config.defaultTheme };
  }
}

function saveSettings(settings) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

/** Retourne l'objet complet du thème actif (banner, quote, color, displayName) */
function getActiveTheme() {
  const settings = loadSettings();
  const name = settings.activeTheme || config.defaultTheme;
  return { name, ...config.themes[name] };
}

/** Change le thème actif. Retourne true si le nom existe, false sinon. */
function setActiveTheme(name) {
  if (!config.themes[name]) return false;
  const settings = loadSettings();
  settings.activeTheme = name;
  saveSettings(settings);
  return true;
}

/** Liste tous les thèmes disponibles (noms) */
function listThemes() {
  return Object.keys(config.themes);
}

module.exports = { getActiveTheme, setActiveTheme, listThemes };
