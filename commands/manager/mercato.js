const crypto = require('crypto');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

function clubName(jid) {
  const c = managerDB.getClub(jid);
  return c ? c.name : 'Club inconnu';
}

module.exports = {
  name: 'mercato',
  category: 'manager',
  description: 'Mercato public — .mercato / lister / acheter / retirer',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas de club. .club <nom>", msg);
    }

    const sub = (args[0] || '').toLowerCase();

    // ─── Liste des annonces ───
    if (!sub || sub === 'liste') {
      const listings = managerDB.getListings().filter(l => {
        // purge auto si joueur plus dans l'effectif vendeur
        const seller = managerDB.getClub(l.sellerJid);
        if (!seller || !seller.squad.some(p => p.id === l.playerId)) {
          managerDB.removeListing(l.id);
          return false;
        }
        return true;
      });

      if (!listings.length) {
        return replyText(sock, jid,
          '📋 *Mercato public*\nAucune annonce.\n\n' +
          'Mets un joueur en vente : `.mercato lister <n° effectif> <prix>`\n' +
          'Le marché NPC reste sur `.marche`.',
          msg
        );
      }

      let text = `📋 *Mercato public* (${listings.length} annonces)\n\n`;
      listings.forEach(l => {
        text += `\`[${l.id}]\` *${l.playerName}* — ${l.pos || '?'} • ${l.rating || '?'} OVR\n`;
        text += `   ${clubName(l.sellerJid)} demande *${l.price.toLocaleString('fr-FR')} €*\n\n`;
      });
      text += 'Acheter : `.mercato acheter <réf>`\nRetirer ta pub : `.mercato retirer <réf>`';
      return replyText(sock, jid, text, msg);
    }

    // ─── Mettre en vente ───
    if (sub === 'lister' || sub === 'vendre') {
      const index = parseInt(args[1], 10) - 1;
      const price = parseInt(args[2], 10);
      const sorted = [...club.squad].sort((a, b) => b.rating - a.rating);

      if (isNaN(index) || index < 0 || index >= sorted.length || isNaN(price) || price < 1000) {
        return replyText(sock, jid, 'Utilisation : `.mercato lister <n° .effectif> <prix>`\nPrix min : 1 000 €', msg);
      }
      if (club.squad.length <= 1) {
        return replyText(sock, jid, 'Tu ne peux pas vendre ton dernier joueur.', msg);
      }

      const player = sorted[index];
      // déjà listé ?
      const existing = managerDB.getListings().find(l => l.playerId === player.id);
      if (existing) {
        return replyText(sock, jid, `Ce joueur est déjà en vente (réf. ${existing.id}).`, msg);
      }

      const listing = {
        id: crypto.randomBytes(3).toString('hex'),
        sellerJid: senderJid,
        playerId: player.id,
        playerName: player.name,
        pos: player.pos,
        rating: player.rating,
        price,
        createdAt: Date.now()
      };
      managerDB.addListing(listing);
      return replyText(sock, jid,
        `📢 *${player.name}* mis sur le mercato à ${price.toLocaleString('fr-FR')} €\nRéf. : \`${listing.id}\``,
        msg
      );
    }

    // ─── Acheter ───
    if (sub === 'acheter') {
      const id = args[1];
      if (!id) return replyText(sock, jid, 'Utilisation : `.mercato acheter <réf>`', msg);

      const listing = managerDB.getListing(id);
      if (!listing) return replyText(sock, jid, 'Annonce introuvable.', msg);
      if (listing.sellerJid === senderJid) {
        return replyText(sock, jid, 'Tu ne peux pas acheter ton propre joueur 😅', msg);
      }

      const seller = managerDB.getClub(listing.sellerJid);
      if (!seller) {
        managerDB.removeListing(id);
        return replyText(sock, jid, 'Vendeur introuvable — annonce supprimée.', msg);
      }

      const player = seller.squad.find(p => p.id === listing.playerId);
      if (!player) {
        managerDB.removeListing(id);
        return replyText(sock, jid, 'Joueur plus dans l\'effectif vendeur.', msg);
      }
      if (club.budget < listing.price) {
        return replyText(sock, jid, `💸 Budget insuffisant (${listing.price.toLocaleString('fr-FR')} € requis).`, msg);
      }
      if (seller.squad.length <= 1) {
        return replyText(sock, jid, 'Le vendeur ne peut pas se séparer de son dernier joueur.', msg);
      }

      managerDB.removeListing(id);
      managerDB.updateClub(listing.sellerJid, {
        budget: seller.budget + listing.price,
        squad: seller.squad.filter(p => p.id !== player.id)
      });
      managerDB.updateClub(senderJid, {
        budget: club.budget - listing.price,
        squad: [...club.squad, player]
      });

      return replyText(sock, jid,
        `✅ Transfert mercato ! *${player.name}* rejoint *${club.name}* pour ${listing.price.toLocaleString('fr-FR')} €.`,
        msg
      );
    }

    // ─── Retirer ───
    if (sub === 'retirer') {
      const id = args[1];
      if (!id) return replyText(sock, jid, 'Utilisation : `.mercato retirer <réf>`', msg);
      const listing = managerDB.getListing(id);
      if (!listing || listing.sellerJid !== senderJid) {
        return replyText(sock, jid, 'Annonce introuvable ou pas à toi.', msg);
      }
      managerDB.removeListing(id);
      return replyText(sock, jid, '🗑️ Annonce retirée du mercato.', msg);
    }

    return replyText(sock, jid,
      'Utilisation :\n' +
      '• `.mercato` — voir les annonces\n' +
      '• `.mercato lister <n°> <prix>` — mettre en vente\n' +
      '• `.mercato acheter <réf>` — acheter\n' +
      '• `.mercato retirer <réf>` — retirer ta pub',
      msg
    );
  }
};
