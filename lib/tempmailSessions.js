const sessions = new Map(); // jid -> { email, login, domain, provider, expiresAt }

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

module.exports = { setSession, getSession, clearSession };
