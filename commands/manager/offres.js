const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');

function clubName(jid) {
  const c = managerDB.getClub(jid);
  return c ? c.name : "Club inconnu";
}

module.exports = {
  name: "offres",
  category: "manager",
  description: "Liste tes offres de transfert reçues et envoyées — .offres",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const all = managerDB.getOffers();

    const received = all.filter(o => o.toJid === senderJid);
    const sent = all.filter(o => o.fromJid === senderJid);

    if (!received.length && !sent.length) {
      return replyText(sock, jid, "Aucune offre en cours. Propose un joueur avec .proposer.", msg);
    }

    let text = "📨 *Offres de transfert*\n\n";
    if (received.length) {
      text += "*Reçues :*\n";
      received.forEach(o => {
        text += `[${o.id}] ${clubName(o.fromJid)} te propose *${o.playerName}* pour ${o.price.toLocaleString('fr-FR')} €\n`;
      });
      text += `\nAccepte avec .accepteroffre <réf>, refuse avec .refuseroffre <réf>\n\n`;
    }
    if (sent.length) {
      text += "*Envoyées :*\n";
      sent.forEach(o => {
        text += `[${o.id}] ${o.playerName} proposé à ${clubName(o.toJid)} pour ${o.price.toLocaleString('fr-FR')} € (en attente)\n`;
      });
    }

    return replyText(sock, jid, text, msg);
  }
};
