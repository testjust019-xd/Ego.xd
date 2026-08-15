const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'afk.json');

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

function setAfk(jid, reason = '') {
  const db = load();
  db[jid] = {
    reason: String(reason || '').slice(0, 120),
    since: Date.now()
  };
  save(db);
  return db[jid];
}

function clearAfk(jid) {
  const db = load();
  const was = db[jid] || null;
  delete db[jid];
  save(db);
  return was;
}

function getAfk(jid) {
  const db = load();
  return db[jid] || null;
}

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  if (h < 24) return rm ? `${h}h ${rm}min` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h`;
}

module.exports = { setAfk, clearAfk, getAfk, formatDuration };
