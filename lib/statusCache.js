/**
 * statusCache.js — garde en mémoire les statuts (stories) WhatsApp vus par
 * le bot, pour pouvoir les re-télécharger via .savestatus / .statut.
 *
 * Le bot ne "voit" que les statuts des contacts qui le partagent avec lui
 * (comportement normal de WhatsApp) — captés via messages.upsert sur le
 * jid spécial 'status@broadcast'.
 */
const { extractContent } = require('./msgContent');

const TTL_MS = 24 * 60 * 60 * 1000; // comme un vrai statut WhatsApp
const byAuthor = new Map(); // authorJid -> [{ ts, type, text, mimetype, mediaMsg, caption }]

function cacheStatus(msg) {
  const jid = msg.key.remoteJid;
  if (jid !== 'status@broadcast' || msg.key.fromMe) return;

  const authorJid = msg.key.participant;
  if (!authorJid) return;

  const content = extractContent(msg);
  if (!content) return;

  const entry = {
    ts: Date.now(),
    type: content.type,
    text: content.text || '',
    mimetype: content.mimetype,
    mediaMsg: content.mediaMsg || null
  };

  if (!byAuthor.has(authorJid)) byAuthor.set(authorJid, []);
  const arr = byAuthor.get(authorJid);
  arr.push(entry);
  if (arr.length > 30) arr.shift();
}

/** Renvoie les statuts encore valides (<24h) d'un contact, du plus récent au plus vieux */
function getStatuses(authorJid) {
  const arr = byAuthor.get(authorJid) || [];
  const now = Date.now();
  const fresh = arr.filter(e => now - e.ts < TTL_MS);
  byAuthor.set(authorJid, fresh);
  return [...fresh].reverse();
}

function listAuthors() {
  const now = Date.now();
  const out = [];
  for (const [jid, arr] of byAuthor) {
    const fresh = arr.filter(e => now - e.ts < TTL_MS);
    if (fresh.length) out.push({ jid, count: fresh.length, lastTs: Math.max(...fresh.map(e => e.ts)) });
  }
  return out.sort((a, b) => b.lastTs - a.lastTs);
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [jid, arr] of byAuthor) {
    const fresh = arr.filter(e => now - e.ts < TTL_MS);
    if (fresh.length) byAuthor.set(jid, fresh);
    else byAuthor.delete(jid);
  }
}, 10 * 60 * 1000).unref();

module.exports = { cacheStatus, getStatuses, listAuthors };
