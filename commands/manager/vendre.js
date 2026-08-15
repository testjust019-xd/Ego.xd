const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');

const SELL_RATIO = 0.6; // revente à 60% de la valeur marchande

module.exports = {
  name: "vendre",
  category: "manager",
  description: "Vend un joueur de ton effectif — .vendre <numéro>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    if (club.squad.length <= 1) {
      return replyText(sock, jid, "Tu ne peux pas vendre ton dernier joueur !", msg);
    }

    const sorted = [...club.squad].sort((a, b) => b.rating - a.rating);
    const index = parseInt(args[0], 10) - 1;

    if (isNaN(index) || index < 0 || index >= sorted.length) {
      return replyText(sock, jid, `Utilisation : .vendre <numéro>\nRegarde .effectif pour voir les numéros (1-${sorted.length}).`, msg);
    }

    const player = sorted[index];
    const sellPrice = Math.round(player.price * SELL_RATIO);
    const newSquad = club.squad.filter(p => p.id !== player.id);

    managerDB.updateClub(senderJid, {
      budget: club.budget + sellPrice,
      squad: newSquad
    });

    return replyText(sock, jid,
      `💰 *${player.name}* vendu pour ${sellPrice.toLocaleString('fr-FR')} €.\n` +
      `Nouveau budget : ${(club.budget + sellPrice).toLocaleString('fr-FR')} €`,
      msg
    );
  }
};
