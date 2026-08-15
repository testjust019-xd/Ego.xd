const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');

module.exports = {
  name: "refuseroffre",
  category: "manager",
  description: "Refuse une offre de transfert reçue — .refuseroffre <réf>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const id = args[0];

    if (!id) {
      return replyText(sock, jid, "Utilisation : .refuseroffre <référence>\nRegarde .offres pour voir tes offres reçues.", msg);
    }

    const offer = managerDB.getOffer(id);
    if (!offer || offer.toJid !== senderJid) {
      return replyText(sock, jid, "Offre introuvable (elle a peut-être expiré ou n'est pas pour toi).", msg);
    }

    managerDB.removeOffer(id);
    return replyText(sock, jid, "🚫 Offre refusée.", msg);
  }
};
