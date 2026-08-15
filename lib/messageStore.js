/**
 * Cache des messages récents (par groupe) pour .antidelete
 * Limite mémoire : max MAX_PER_CHAT messages, TTL 45 min
 */

const MAX_PER_CHAT = 120;
const TTL_MS = 45 * 60 * 1000;

/** @type {Map<string, Map<string, object>>} chatJid -> (msgId -> payload) */
const store = new Map();

function chatMap(jid) {
  if (!store.has(jid)) store.set(jid, new Map());
  return store.get(jid);
}

function put(jid, id, payload) {
  if (!jid || !id) return;
  const map = chatMap(jid);
  map.set(id, { ...payload, _ts: Date.now() });
  // purge old
  if (map.size > MAX_PER_CHAT) {
    const first = map.keys().next().value;
    map.delete(first);
  }
}

function get(jid, id) {
  const map = store.get(jid);
  if (!map) return null;
  const item = map.get(id);
  if (!item) return null;
  if (Date.now() - item._ts > TTL_MS) {
    map.delete(id);
    return null;
  }
  return item;
}

function remove(jid, id) {
  store.get(jid)?.delete(id);
}

module.exports = { put, get, remove };
