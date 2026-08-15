// Garde en mémoire, PAR CHAT, la dernière liste de résultats affichée par
// .play2, avec une expiration (par défaut 60s) pour que ".play2 <numero>"
// sache à quoi ça correspond. Passé le délai, la session expire toute seule.

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
