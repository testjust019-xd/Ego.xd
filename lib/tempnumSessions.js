const sessions = new Map(); // jid -> { phone, country, expiresAt }
const lastLists = new Map(); // jid -> [{ phone, country }, ...] (pour choisir par index)

function setSession(jid, data, ttlMs = 60 * 60 * 1000) {
  sessions.set(jid, { ...data, expiresAt: Date.now() + ttlMs });
}

function getSession(jid) {
  const s = sessions.get(jid);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    sessions.delete(jid);
    return null;
  }
  return s;
}

function clearSession(jid) {
  sessions.delete(jid);
}

function setLastList(jid, list) {
  lastLists.set(jid, list);
}

function getLastList(jid) {
  return lastLists.get(jid) || null;
}

module.exports = { setSession, getSession, clearSession, setLastList, getLastList };
