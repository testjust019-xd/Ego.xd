const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getTargetJid } = require('../../lib/groupHelpers');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: "defier",
  category: "manager",
  description: "Défie un autre manager en PvP — réponds à son message ou mentionne-le avec .defier",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const myClub = managerDB.getClub(senderJid);

    if (!myClub) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    const targetJid = getTargetJid(msg);
    if (!targetJid) {
      return replyText(sock, jid, "Réponds au message de la personne à défier, ou mentionne-la : .defier @quelqu'un", msg);
    }
    if (targetJid === senderJid) {
      return replyText(sock, jid, "Tu ne peux pas te défier toi-même 😅", msg);
    }

    const targetClub = managerDB.getClub(targetJid);
    if (!targetClub) {
      return replyText(sock, jid, "Cette personne n'a pas encore de club (.club <nom>), impossible de la défier.", msg);
    }

    const now = Date.now();
    if (now - (myClub.lastPvp || 0) < engine.PVP_COOLDOWN_MS) {
      const minutes = Math.ceil((engine.PVP_COOLDOWN_MS - (now - myClub.lastPvp)) / 60000);
      return replyText(sock, jid, `⏳ Ton équipe doit encore récupérer. Reviens dans ${minutes} min.`, msg);
    }

    const existing = managerDB.getChallenge(targetJid);
    if (existing && Date.now() - existing.createdAt < engine.CHALLENGE_TTL_MS) {
      return replyText(sock, jid, "Cette personne a déjà un défi en attente. Patiente qu'il expire ou soit traité.", msg);
    }

    managerDB.setChallenge(targetJid, { fromJid: senderJid, createdAt: now });

    return replyText(sock, jid,
      `⚔️ *${myClub.name}* défie *${targetClub.name}* en match amical !\n` +
      `La personne défiée a 15 min pour taper .accepter (ou .refuser).`,
      msg
    );
  }
};
