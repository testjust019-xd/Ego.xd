const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

const RESULT_LABEL = { win: "✅ VICTOIRE", draw: "➖ MATCH NUL", loss: "❌ DÉFAITE" };

module.exports = {
  name: "accepter",
  category: "manager",
  description: "Accepte un défi PvP en attente contre toi — .accepter",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    const challenge = managerDB.getChallenge(senderJid);
    if (!challenge) {
      return replyText(sock, jid, "Tu n'as aucun défi en attente.", msg);
    }
    if (Date.now() - challenge.createdAt > engine.CHALLENGE_TTL_MS) {
      managerDB.deleteChallenge(senderJid);
      return replyText(sock, jid, "Ce défi a expiré.", msg);
    }

    const myClub = managerDB.getClub(senderJid);
    const oppClub = managerDB.getClub(challenge.fromJid);
    if (!myClub || !oppClub) {
      managerDB.deleteChallenge(senderJid);
      return replyText(sock, jid, "Un des deux clubs n'existe plus. Défi annulé.", msg);
    }

    managerDB.deleteChallenge(senderJid);

    const sim = engine.simulateRealMatch(oppClub, myClub); // A = challenger, B = celui qui accepte
    // narration live avant le bilan
    await engine.narrateLiveMatch((text) => replyText(sock, jid, text, msg), oppClub.name, myClub.name, sim);
    const now = Date.now();

    const applyStats = (stats, result) => ({
      played: stats.played + 1,
      wins: stats.wins + (result === 'win' ? 1 : 0),
      draws: stats.draws + (result === 'draw' ? 1 : 0),
      losses: stats.losses + (result === 'loss' ? 1 : 0)
    });

    let challengerResult, accepterResult;
    if (sim.result === 'A') { challengerResult = 'win'; accepterResult = 'loss'; }
    else if (sim.result === 'B') { challengerResult = 'loss'; accepterResult = 'win'; }
    else { challengerResult = 'draw'; accepterResult = 'draw'; }

    const baseReward = 12_000 + engine.STADIUM_TIERS[Math.max(myClub.stadiumTier, oppClub.stadiumTier)].tier * 4_000;
    const challengerReward = Math.round(baseReward * (challengerResult === 'win' ? 1.4 : challengerResult === 'draw' ? 0.9 : 0.5));
    const accepterReward = Math.round(baseReward * (accepterResult === 'win' ? 1.4 : accepterResult === 'draw' ? 0.9 : 0.5));

    managerDB.updateClub(challenge.fromJid, {
      budget: oppClub.budget + challengerReward,
      pvpStats: applyStats(oppClub.pvpStats || { played: 0, wins: 0, draws: 0, losses: 0 }, challengerResult),
      lastPvp: now
    });
    managerDB.updateClub(senderJid, {
      budget: myClub.budget + accepterReward,
      pvpStats: applyStats(myClub.pvpStats || { played: 0, wins: 0, draws: 0, losses: 0 }, accepterResult),
      lastPvp: now
    });

    let text = engine.formatMatchReport(oppClub.name, myClub.name, sim);
    text += `
${oppClub.name} : ${RESULT_LABEL[challengerResult]} (+${challengerReward.toLocaleString('fr-FR')} €)
`;
    text += `${myClub.name} : ${RESULT_LABEL[accepterResult]} (+${accepterReward.toLocaleString('fr-FR')} €)`;

    return replyText(sock, jid, text, msg);
  }
};
