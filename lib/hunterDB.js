const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'hunters.json');

const RANKS = ['E', 'D', 'C', 'B', 'A', 'S', 'National', 'Monarch'];
const RANK_XP = [0, 300, 1000, 3000, 8000, 20000, 50000, 150000];

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch { return {}; }
}
function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getHunter(jid) {
  const db = load();
  if (!db[jid]) {
    db[jid] = { xp: 0, rank: 'E', shadows: 0, gates: 0, skills: [], lastGate: 0, lastLoot: 0 };
    save(db);
  }
  return db[jid];
}

function addXp(jid, amount) {
  const db = load();
  if (!db[jid]) db[jid] = { xp: 0, rank: 'E', shadows: 0, gates: 0, skills: [], lastGate: 0, lastLoot: 0 };
  db[jid].xp = (db[jid].xp || 0) + amount;
  // auto rank
  let rankIdx = 0;
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (db[jid].xp >= RANK_XP[i]) { rankIdx = i; break; }
  }
  db[jid].rank = RANKS[rankIdx];
  save(db);
  return db[jid];
}

function updateHunter(jid, updates) {
  const db = load();
  if (!db[jid]) db[jid] = { xp: 0, rank: 'E', shadows: 0, gates: 0, skills: [], lastGate: 0, lastLoot: 0 };
  Object.assign(db[jid], updates);
  save(db);
  return db[jid];
}

module.exports = { getHunter, addXp, updateHunter, RANKS, RANK_XP };
