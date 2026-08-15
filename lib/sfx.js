/**
 * Effets sonores courts (assets/sfx/*.ogg)
 * Envoyés en note vocale (ptt) pour lecture auto-friendly
 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'assets', 'sfx');

const MAP = {
  ping: 'ping.ogg',
  menu: 'menu.ogg',
  arise: 'arise.ogg',
  gate: 'gate.ogg',
  success: 'success.ogg',
  fail: 'fail.ogg',
  levelup: 'levelup.ogg',
  click: 'click.ogg'
};

function resolveSfx(name) {
  const file = MAP[name] || (String(name).endsWith('.ogg') ? name : null);
  if (!file) return null;
  const full = path.isAbsolute(file) ? file : path.join(DIR, file);
  return fs.existsSync(full) ? full : null;
}

/**
 * @param {number} chance 0–1
 * @param {string} name  clé MAP
 */
function maybeSfx(name, chance = 0.7) {
  if (Math.random() > chance) return null;
  return resolveSfx(name);
}

module.exports = { resolveSfx, maybeSfx, MAP, DIR };
