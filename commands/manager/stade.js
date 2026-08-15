const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: "stade",
  category: "manager",
  description: "Affiche ou améliore ton stade — .stade / .stade upgrade",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    const current = engine.STADIUM_TIERS[club.stadiumTier];
    const isMax = club.stadiumTier >= engine.MAX_STADIUM_TIER;
    const next = isMax ? null : engine.STADIUM_TIERS[club.stadiumTier + 1];

    if (args[0]?.toLowerCase() === 'upgrade') {
      if (isMax) {
        return replyText(sock, jid, "🏟️ Ton stade est déjà au niveau maximum !", msg);
      }
      if (club.budget < next.upgradeCost) {
        return replyText(sock, jid, `💸 Il te faut ${next.upgradeCost.toLocaleString('fr-FR')} € pour passer au niveau ${next.tier} (${next.name}). Budget actuel : ${club.budget.toLocaleString('fr-FR')} €`, msg);
      }
      managerDB.updateClub(senderJid, {
        budget: club.budget - next.upgradeCost,
        stadiumTier: next.tier
      });
      return replyText(sock, jid, `🏗️ Stade amélioré : *${next.name}* (${next.capacity.toLocaleString('fr-FR')} places) !\n💰 -${next.upgradeCost.toLocaleString('fr-FR')} €`, msg);
    }

    let text = `🏟️ *${current.name}* (niveau ${current.tier}/${engine.MAX_STADIUM_TIER})\n👥 Capacité : ${current.capacity.toLocaleString('fr-FR')} places\n\n`;
    if (isMax) {
      text += "Niveau maximum atteint.";
    } else {
      text += `Prochain niveau : *${next.name}* (${next.capacity.toLocaleString('fr-FR')} places)\n💰 Coût : ${next.upgradeCost.toLocaleString('fr-FR')} €\n\nTape .stade upgrade pour améliorer.`;
    }

    return replyText(sock, jid, text, msg);
  }
};
