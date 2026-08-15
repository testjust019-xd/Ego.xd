const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');

module.exports = {
  name: "effectif",
  category: "manager",
  description: "Affiche la liste de tes joueurs — .effectif",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    if (!club.squad.length) {
      return replyText(sock, jid, "Ton effectif est vide ! Va recruter sur .marche.", msg);
    }

    const sorted = [...club.squad].sort((a, b) => b.rating - a.rating);
    let text = `👥 *Effectif de ${club.name}* (${club.squad.length} joueurs)\n\n`;
    sorted.forEach((p, i) => {
      text += `${i + 1}. *${p.name}* — ${p.pos} • ${p.rating} OVR (pot. ${p.potential}) • ${p.age} ans • ${p.price.toLocaleString('fr-FR')} €\n`;
    });
    text += `\nVends un joueur avec .vendre <numéro>.`;

    return replyText(sock, jid, text, msg);
  }
};
