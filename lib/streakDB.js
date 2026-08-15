const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'streaks.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch { return {}; }
}
function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getStreak(jid) {
  const db = load();
  return db[jid] || { count: 0, lastClaim: 0, best: 0 };
}

function claimStreak(jid) {
  const db = load();
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let u = db[jid] || { count: 0, lastClaim: 0, best: 0 };
  const elapsed = now - (u.lastClaim || 0);

  if (elapsed < 20 * 60 * 60 * 1000 && u.lastClaim) {
    // déjà claim aujourd'hui (fenêtre ~20h pour tolérer fuseau)
    return { already: true, ...u };
  }
  if (elapsed < 48 * 60 * 60 * 1000 && u.lastClaim) {
    u.count = (u.count || 0) + 1;
  } else {
    u.count = 1;
  }
  u.lastClaim = now;
  if (u.count > (u.best || 0)) u.best = u.count;
  db[jid] = u;
  save(db);
  return { already: false, ...u };
}

module.exports = { getStreak, claimStreak };
