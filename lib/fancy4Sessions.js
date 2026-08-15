const sessions = new Map(); // jid -> { results, expiresAt }

function setSession(jid, results, ttlMs = 60000) {
  sessions.set(jid, { results, expiresAt: Date.now() + ttlMs });
}

function getSession(jid) {
  const session = sessions.get(jid);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    sessions.delete(jid);
    return null;
  }
  return session;
}

function clearSession(jid) {
  sessions.delete(jid);
}

module.exports = { setSession, getSession, clearSession };
