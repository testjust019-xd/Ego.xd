const fs = require('fs');
const path = require('path');

const WARN_PATH = path.join(__dirname, '..', 'data', 'warnings.json');
const DEFAULT_MAX = 3;

function loadWarnings() {
  try {
    return JSON.parse(fs.readFileSync(WARN_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

function saveWarnings(data) {
  fs.mkdirSync(path.dirname(WARN_PATH), { recursive: true });
  fs.writeFileSync(WARN_PATH, JSON.stringify(data, null, 2));
}

function warnKey(groupJid, userJid) {
  return `${groupJid}:${userJid}`;
}

/** Nombre d'avertissements actuels pour un membre dans un groupe */
function getWarnCount(groupJid, userJid) {
  const data = loadWarnings();
  return data[warnKey(groupJid, userJid)] || 0;
}

/**
 * Ajoute 1 avertissement.
 * @returns {{ count: number, kicked: boolean, max: number }}
 */
async function addWarning(sock, groupJid, userJid, maxWarnings = DEFAULT_MAX) {
  const data = loadWarnings();
  const key = warnKey(groupJid, userJid);
  data[key] = (data[key] || 0) + 1;
  const count = data[key];

  let kicked = false;
  if (count >= maxWarnings) {
    try {
      await sock.groupParticipantsUpdate(groupJid, [userJid], 'remove');
      delete data[key];
      kicked = true;
    } catch (err) {
      console.error('[warnings] kick failed:', err.message);
    }
  }

  saveWarnings(data);
  return { count: kicked ? maxWarnings : count, kicked, max: maxWarnings };
}

/** Retire 1 avertissement (min 0) */
function removeWarning(groupJid, userJid) {
  const data = loadWarnings();
  const key = warnKey(groupJid, userJid);
  if (!data[key]) return 0;
  data[key] = Math.max(0, data[key] - 1);
  if (data[key] === 0) delete data[key];
  saveWarnings(data);
  return data[key] || 0;
}

/** Remet à zéro les warns d'un membre (ou de tout le groupe si userJid null) */
function resetWarnings(groupJid, userJid = null) {
  const data = loadWarnings();
  if (userJid) {
    delete data[warnKey(groupJid, userJid)];
  } else {
    const prefix = `${groupJid}:`;
    for (const k of Object.keys(data)) {
      if (k.startsWith(prefix)) delete data[k];
    }
  }
  saveWarnings(data);
}

/**
 * Applique un autowarn (antilink / mot interdit) et renvoie un message à afficher.
 * @param {object} opts
 * @param {string} opts.reason - ex: "lien interdit" | "mot interdit: xxx"
 */
async function applyAutowarn(sock, groupJid, userJid, opts = {}) {
  const { reason = 'règle du groupe', maxWarnings = DEFAULT_MAX, quotedMsg = null } = opts;
  const result = await addWarning(sock, groupJid, userJid, maxWarnings);
  const tag = `@${String(userJid).replace(/@.*$/, '').split(':')[0]}`;

  let text;
  if (result.kicked) {
    text =
      `🚫 *Autowarn* — ${tag}\n` +
      `Raison : ${reason}\n` +
      `⚠️ ${result.max}/${result.max} avertissements → *expulsé*.`;
  } else {
    text =
      `⚠️ *Autowarn* — ${tag}\n` +
      `Raison : ${reason}\n` +
      `Avertissements : *${result.count}/${result.max}*\n` +
      `_À ${result.max} → expulsion automatique._`;
  }

  try {
    await sock.sendMessage(
      groupJid,
      { text, mentions: [userJid] },
      quotedMsg ? { quoted: quotedMsg } : undefined
    );
  } catch (err) {
    console.error('[autowarn] reply failed:', err.message);
  }

  return result;
}

module.exports = {
  loadWarnings,
  saveWarnings,
  getWarnCount,
  addWarning,
  removeWarning,
  resetWarnings,
  applyAutowarn,
  DEFAULT_MAX,
  WARN_PATH
};
