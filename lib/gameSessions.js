/**
 * Sessions de jeux en mémoire (pendu, motmystere, combat, duel, remind...)
 */
const sessions = new Map(); // key -> data

function set(key, data, ttlMs = 10 * 60 * 1000) {
  sessions.set(key, { ...data, expiresAt: Date.now() + ttlMs });
}

function get(key) {
  const s = sessions.get(key);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(key);
    return null;
  }
  return s;
}

function del(key) {
  sessions.delete(key);
}

function key(jid, name) {
  return `${jid}:${name}`;
}

module.exports = { set, get, del, key };
