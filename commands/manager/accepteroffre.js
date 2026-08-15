const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');

module.exports = {
  name: "accepteroffre",
  category: "manager",
  description: "Accepte une offre de transfert reçue — .accepteroffre <réf>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const id = args[0];

    if (!id) {
      return replyText(sock, jid, "Utilisation : .accepteroffre <référence>\nRegarde .offres pour voir tes offres reçues.", msg);
    }

    const offer = managerDB.getOffer(id);
    if (!offer || offer.toJid !== senderJid) {
      return replyText(sock, jid, "Offre introuvable (elle a peut-être expiré ou n'est pas pour toi).", msg);
    }

    const buyerClub = managerDB.getClub(senderJid); // celui qui accepte = acheteur
    const sellerClub = managerDB.getClub(offer.fromJid);

    if (!buyerClub || !sellerClub) {
      managerDB.removeOffer(id);
      return replyText(sock, jid, "Un des deux clubs n'existe plus. Offre annulée.", msg);
    }

    const player = sellerClub.squad.find(p => p.id === offer.playerId);
    if (!player) {
      managerDB.removeOffer(id);
      return replyText(sock, jid, "Ce joueur n'est plus dans l'effectif du vendeur. Offre annulée.", msg);
    }

    if (buyerClub.budget < offer.price) {
      return replyText(sock, jid, `💸 Budget insuffisant. Il te faut ${offer.price.toLocaleString('fr-FR')} €, tu as ${buyerClub.budget.toLocaleString('fr-FR')} €.`, msg);
    }

    managerDB.removeOffer(id);

    managerDB.updateClub(offer.fromJid, {
      budget: sellerClub.budget + offer.price,
      squad: sellerClub.squad.filter(p => p.id !== player.id)
    });
    managerDB.updateClub(senderJid, {
      budget: buyerClub.budget - offer.price,
      squad: [...buyerClub.squad, player]
    });

    return replyText(sock, jid,
      `✅ Transfert conclu ! *${player.name}* rejoint *${buyerClub.name}* pour ${offer.price.toLocaleString('fr-FR')} €.`,
      msg
    );
  }
};
