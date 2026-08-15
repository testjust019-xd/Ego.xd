const { RANKS, getHunter } = require('./hunterDB');

/** Position du rang dans la hiérarchie (0 = E, plus haut = plus fort) */
function rankIndex(rank) {
  const i = RANKS.indexOf(rank);
  return i === -1 ? 0 : i;
}

/** true si userRank >= requiredRank dans la hiérarchie E→D→C→B→A→S→National→Monarch */
function meetsRank(userRank, requiredRank) {
  return rankIndex(userRank) >= rankIndex(requiredRank);
}

/** Rang actuel d'un joueur (JID WhatsApp) */
function getUserRank(senderJid) {
  return getHunter(senderJid).rank;
}

module.exports = { RANKS, rankIndex, meetsRank, getUserRank };
