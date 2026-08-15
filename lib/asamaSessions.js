// Sessions interactives pour .asama (recherche → saison → épisode)
// Même pattern que play2Sessions.js

const sessions = new Map(); // jid -> { step, data, expiresAt }

const DEFAULT_TTL = 120000; // 2 min (plus long que play2 car multi-étapes)

function setSession(jid, payload, ttlMs = DEFAULT_TTL) {
  sessions.set(jid, { ...payload, expiresAt: Date.now() + ttlMs });
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
