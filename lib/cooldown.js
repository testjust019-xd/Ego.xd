const {
  RANK_COOLDOWN_MULTIPLIER,
  getCooldownMultiplier,
  effectiveCooldownSeconds
} = require('./commandAccess');

// jid::commandName -> timestamp ms dernière utilisation
const lastUsed = new Map();

/**
 * Vérifie si l'utilisateur peut exécuter la commande maintenant.
 * @returns {{ ok: true } | { ok: false, remainingSeconds: number }}
 */
function checkCooldown(jid, commandName, baseSeconds, rank) {
  if (!baseSeconds || baseSeconds <= 0) return { ok: true };

  const effective = effectiveCooldownSeconds(baseSeconds, rank);
  if (effective <= 0) return { ok: true };

  const key = `${jid}::${commandName}`;
  const last = lastUsed.get(key) || 0;
  const elapsed = (Date.now() - last) / 1000;

  if (elapsed < effective) {
    return { ok: false, remainingSeconds: Math.ceil(effective - elapsed) };
  }
  return { ok: true };
}

function markUsed(jid, commandName) {
  const key = `${jid}::${commandName}`;
  lastUsed.set(key, Date.now());
}

module.exports = {
  RANK_MULTIPLIER: RANK_COOLDOWN_MULTIPLIER,
  getMultiplier: getCooldownMultiplier,
  effectiveCooldown: effectiveCooldownSeconds,
  checkCooldown,
  markUsed
};
