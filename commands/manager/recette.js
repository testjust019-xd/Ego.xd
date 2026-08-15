const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: "recette",
  category: "manager",
  description: "Récupère la recette de ton stade — .recette",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    const now = Date.now();
    if (now - club.lastRecette < engine.RECETTE_COOLDOWN_MS) {
      const remaining = engine.RECETTE_COOLDOWN_MS - (now - club.lastRecette);
      const minutes = Math.ceil(remaining / 60000);
      return replyText(sock, jid, `⏳ Rien à encaisser pour l'instant. Reviens dans ${minutes} min.`, msg);
    }

    const stadium = engine.STADIUM_TIERS[club.stadiumTier];
    const base = 4000 * stadium.tier;
    const repFactor = 0.7 + (club.reputation / 100) * 0.6; // 0.7x à 1.3x
    const amount = Math.round(base * repFactor * (0.85 + Math.random() * 0.3));

    managerDB.updateClub(senderJid, {
      budget: club.budget + amount,
      lastRecette: now
    });

    return replyText(sock, jid,
      `🎟️ Recette de billetterie au ${stadium.name} : +${amount.toLocaleString('fr-FR')} €\n` +
      `💰 Nouveau budget : ${(club.budget + amount).toLocaleString('fr-FR')} €`,
      msg
    );
  }
};
