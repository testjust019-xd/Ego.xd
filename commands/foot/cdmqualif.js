const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'cdmqualif',
  category: 'foot',
  description: 'État des qualifications CDM par zone — .cdmqualif',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const zone = (args[0] || '').toLowerCase();

    const text =
      `🌍 *Qualifications Coupe du Monde*\n\n` +
      `Zones FIFA :\n` +
      `· 🇪🇺 UEFA — Europe\n` +
      `· アフリカ CAF — Afrique\n` +
      `· 🌎 CONMEBOL — Amérique du Sud\n` +
      `· 北美 CONCACAF\n` +
      `· 🌏 AFC — Asie\n` +
      `· 🌊 OFC — Océanie\n\n` +
      (zone
        ? `_Filtre "${zone}" : consulte FIFA.com / TheSportsDB pour le détail live des groupes._`
        : `_Tape \`.cdmqualif caf\` etc. — détail live via sites officiels (pas d'API gratuite complète)._`) +
      `\n\n💡 \`.live\` / \`.fclassement\` pour les compétitions disponibles.`;
    return replyText(sock, jid, text, msg);
  }
};
