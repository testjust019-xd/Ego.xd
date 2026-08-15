const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'notes.json');

function load() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')); } catch { return {}; }
}
function save(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function listNotes(jid) {
  const db = load();
  return db[jid] || [];
}

function addNote(jid, text) {
  const db = load();
  if (!db[jid]) db[jid] = [];
  db[jid].push({ text, at: Date.now() });
  if (db[jid].length > 20) db[jid].shift();
  save(db);
  return db[jid];
}

function clearNotes(jid) {
  const db = load();
  db[jid] = [];
  save(db);
}

module.exports = { listNotes, addNote, clearNotes };
