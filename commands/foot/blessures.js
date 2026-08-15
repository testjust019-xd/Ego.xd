const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'blessures',
  category: 'foot',
  description: 'Joueurs blesses/suspendus (indicatif) — .blessures <equipe>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const team = args.join(' ').trim();
    if (!team) return replyText(sock, jid, 'Ex: `.blessures PSG`', msg);

    const text =
      '🩹 *Blessures / suspensions — ' + team + '*\n\n' +
      '_Aucune source gratuite stable pour les blessures en temps réel._\n\n' +
      'Sources recommandées :\n' +
      '· Transfermarkt\n' +
      '· Site officiel du club\n' +
      '· `.rumeurs ' + team + '` pour actualité\n\n' +
      '_Cette commande reste un placeholder utile pour le menu._';
    return replyText(sock, jid, text, msg);
  }
};
