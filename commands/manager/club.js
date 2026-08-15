const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: "club",
  category: "manager",
  description: "Crée ton club (.club <nom>) ou affiche sa fiche (.club)",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const existing = managerDB.getClub(senderJid);

    if (!existing) {
      const name = args.join(' ').trim();
      if (!name) {
        return replyText(sock, jid,
          "⚽ *Bienvenue dans le mode Manager !*\n\n" +
          "Tu n'as pas encore de club. Crée-en un :\n" +
          "👉 .club <nom de ton club>\n\n" +
          "Une fois créé, découvre tes joueurs avec .effectif, et lance-toi avec .marche, .tactique, .entrainement, .amical, .stade, .recette, .classement.",
          msg
        );
      }
      const club = engine.createNewClub(name);
      managerDB.createClub(senderJid, club);
      const power = Math.round(engine.calcClubPower(club));
      return replyText(sock, jid,
        `🏟️ *Club fondé : ${club.name}*\n\n` +
        `💰 Budget de départ : ${club.budget.toLocaleString('fr-FR')} €\n` +
        `👥 Effectif : ${club.squad.length} joueurs\n` +
        `📊 Force estimée : ${power}/100\n` +
        `🏆 Réputation : ${club.reputation}/100\n\n` +
        `Tape .effectif pour voir ton équipe, ou .marche pour recruter.`,
        msg
      );
    }

    const club = existing;
    const power = Math.round(engine.calcClubPower(club));
    const stadium = engine.STADIUM_TIERS[club.stadiumTier];
    const s = club.stats;
    const formation = engine.FORMATIONS[club.formation]?.label || club.formation;

    const text =
      `🏟️ *${club.name}*\n\n` +
      `💰 Budget : ${club.budget.toLocaleString('fr-FR')} €\n` +
      `🏆 Réputation : ${club.reputation}/100\n` +
      `📊 Force de l'équipe : ${power}/100\n` +
      `🎯 Tactique : ${formation}\n` +
      `🏟️ Stade : ${stadium.name} (niv. ${stadium.tier}, ${stadium.capacity.toLocaleString('fr-FR')} places)\n` +
      `👥 Effectif : ${club.squad.length} joueurs\n\n` +
      `*Bilan*\n` +
      `Matchs : ${s.played} • V ${s.wins} / N ${s.draws} / D ${s.losses}\n` +
      `Buts : ${s.gf} pour, ${s.ga} contre\n` +
      `Points : ${s.points}`;

    return replyText(sock, jid, text, msg);
  }
};
