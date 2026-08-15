/**
 * Limite Group Factory : N créations par fenêtre glissante de 7 jours
 */
const fs = require('fs');
const path = require('path');
const peopleDB = require('./peopleDB');

const DB_PATH = path.join(__dirname, '..', 'data', 'factoryLimit.json');
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

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

function keyFor(jid) {
  return peopleDB.normalizeJid(jid);
}

/** @returns {{ ok: boolean, used: number, limit: number, retryInHours: number }} */
function check(jid, limit = 4) {
  const id = keyFor(jid);
  const db = load();
  const now = Date.now();
  let stamps = Array.isArray(db[id]) ? db[id] : [];
  stamps = stamps.filter((t) => now - t < WEEK_MS);
  db[id] = stamps;
  save(db);
  const used = stamps.length;
  if (used >= limit) {
    const oldest = Math.min(...stamps);
    const retryInHours = Math.max(1, Math.ceil((oldest + WEEK_MS - now) / 3600000));
    return { ok: false, used, limit, retryInHours };
  }
  return { ok: true, used, limit, retryInHours: 0 };
}

function record(jid) {
  const id = keyFor(jid);
  const db = load();
  const now = Date.now();
  let stamps = Array.isArray(db[id]) ? db[id] : [];
  stamps = stamps.filter((t) => now - t < WEEK_MS);
  stamps.push(now);
  db[id] = stamps;
  save(db);
  return stamps.length;
}

module.exports = { check, record };
