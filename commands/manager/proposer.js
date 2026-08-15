const crypto = require('crypto');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getTargetJid } = require('../../lib/groupHelpers');
const managerDB = require('../../lib/managerDB');

module.exports = {
  name: "proposer",
  category: "manager",
  description: "Propose un joueur à un autre manager — réponds/mentionne + .proposer <numéro effectif> <prix>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const myClub = managerDB.getClub(senderJid);

    if (!myClub) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    const targetJid = getTargetJid(msg);
    if (!targetJid) {
      return replyText(sock, jid, "Réponds au message du manager visé, ou mentionne-le : .proposer @quelqu'un <numéro> <prix>\n(numéro = position dans ton .effectif)", msg);
    }
    if (targetJid === senderJid) {
      return replyText(sock, jid, "Tu ne peux pas te faire une offre à toi-même 😅", msg);
    }

    const targetClub = managerDB.getClub(targetJid);
    if (!targetClub) {
      return replyText(sock, jid, "Cette personne n'a pas encore de club.", msg);
    }

    const index = parseInt(args[0], 10) - 1;
    const price = parseInt(args[1], 10);
    const sorted = [...myClub.squad].sort((a, b) => b.rating - a.rating);

    if (isNaN(index) || index < 0 || index >= sorted.length || isNaN(price) || price <= 0) {
      return replyText(sock, jid, "Utilisation : .proposer <numéro de ton .effectif> <prix demandé>", msg);
    }

    const player = sorted[index];
    const offer = {
      id: crypto.randomBytes(3).toString('hex'),
      fromJid: senderJid,
      toJid: targetJid,
      playerId: player.id,
      playerName: player.name,
      price,
      createdAt: Date.now()
    };
    managerDB.addOffer(offer);

    return replyText(sock, jid,
      `📨 Offre envoyée à *${targetClub.name}* :\n` +
      `${player.name} (${player.pos}, ${player.rating} OVR) pour ${price.toLocaleString('fr-FR')} €\n\n` +
      `Réf. offre : ${offer.id} — la personne visée peut taper .offres pour la voir.`,
      msg
    );
  }
};
