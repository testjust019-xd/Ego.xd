const config = require('../config');

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Simule "en train d'écrire..." ou "enregistrement audio..." avant de répondre.
 * Tout est réglable dans config.js (presence.enabled, presence.random, etc.)
 */
async function simulatePresence(sock, jid) {
  if (!config.presence.enabled) return;

  const type = config.presence.random
    ? config.presence.types[Math.floor(Math.random() * config.presence.types.length)]
    : config.presence.fixedType;

  const delay = randomDelay(config.presence.delayMs.min, config.presence.delayMs.max);

  try {
    await sock.sendPresenceUpdate(type, jid);
    await new Promise(resolve => setTimeout(resolve, delay));
    await sock.sendPresenceUpdate('paused', jid);
  } catch (err) {
    // si ça échoue, on ignore simplement (pas bloquant pour la réponse)
    console.log('[presence] erreur ignorée:', err.message);
  }
}

module.exports = { simulatePresence };
