// Garde en mémoire les derniers messages envoyés PAR LE BOT dans chaque chat,
// pour pouvoir les supprimer avec .purge. Sert aussi à distinguer un écho
// du bot (sa propre réponse revient dans messages.upsert) d'un vrai message
// tapé par l'owner depuis son téléphone (les deux ont fromMe = true).

const sentMessages = new Map(); // jid -> [key1, key2, ...]
const sentIds = [];             // liste ordonnée des IDs envoyés par le bot
const sentIdsSet = new Set();   // pour une recherche rapide

function trackMessage(jid, key) {
  if (!sentMessages.has(jid)) sentMessages.set(jid, []);
  const arr = sentMessages.get(jid);
  arr.push(key);
  if (arr.length > 100) arr.shift();

  sentIds.push(key.id);
  sentIdsSet.add(key.id);
  if (sentIds.length > 500) {
    const removed = sentIds.shift();
    sentIdsSet.delete(removed);
  }
}

function getLastMessages(jid, count) {
  const arr = sentMessages.get(jid) || [];
  return arr.slice(-count);
}

function removeMessages(jid, keysToRemove) {
  const arr = sentMessages.get(jid) || [];
  sentMessages.set(jid, arr.filter(k => !keysToRemove.includes(k)));
}

/** true si cet ID de message a été envoyé par le bot lui-même (écho à ignorer) */
function isOwnEcho(id) {
  return sentIdsSet.has(id);
}

module.exports = { trackMessage, getLastMessages, removeMessages, isOwnEcho };
