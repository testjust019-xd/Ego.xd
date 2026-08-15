const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'users.json');

function loadDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/** Récupère (ou crée) le profil d'un utilisateur */
function getUser(jid) {
  const db = loadDB();
  if (!db[jid]) {
    db[jid] = { balance: 0, xp: 0, lastDaily: 0, lastWork: 0, cards: [] };
    saveDB(db);
  }
  if (!Array.isArray(db[jid].cards)) db[jid].cards = [];
  return db[jid];
}

/** Met à jour partiellement le profil d'un utilisateur */
function updateUser(jid, updates) {
  const db = loadDB();
  if (!db[jid]) db[jid] = { balance: 0, xp: 0, lastDaily: 0, lastWork: 0, cards: [] };
  db[jid] = { ...db[jid], ...updates };
  saveDB(db);
  return db[jid];
}

/** Retourne le top N des utilisateurs triés par solde */
function getLeaderboard(limit = 10) {
  const db = loadDB();
  return Object.entries(db)
    .map(([jid, data]) => ({ jid, ...data }))
    .sort((a, b) => b.balance - a.balance)
    .slice(0, limit);
}

module.exports = { getUser, updateUser, getLeaderboard };
