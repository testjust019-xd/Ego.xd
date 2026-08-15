const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { createGameLink } = require('../../helpers/gameWeb');

const PUZZLES = [
  { hint: 'Protagoniste de Solo Leveling', answer: 'sung jin woo' },
  { hint: 'Titre FR : "Seul face au niveau"', answer: 'solo leveling' },
  { hint: 'Capitale de la Côte d\'Ivoire', answer: 'yamoussoukro' },
  { hint: 'Plus grande ville économique CI', answer: 'abidjan' },
  { hint: 'Anime des sorciers de Tokyo', answer: 'jujutsu kaisen' },
  { hint: 'Créature invoquée par Jin-Woo (nom générique)', answer: 'ombre' },
];

module.exports = {
  name: 'puzzle',
  category: 'games',
  description: 'Énigme / image floutée textuelle — .puzzle',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (args[0] === 'answer' || args[0] === 'reponse') {
      return replyText(sock, jid, 'Les réponses sont dans le spoiler mental : relance `.puzzle` pour une nouvelle !', msg);
    }
    const p = PUZZLES[Math.floor(Math.random() * PUZZLES.length)];
    const masked = p.answer.replace(/[a-zA-Zàâéèêëïîôùûüç]/gi, '░');
    const { links } = createGameLink({
      chatJid: jid,
      type: 'answer',
      minRank: 'E',
      players: [{ jid: getSenderJid(sock, msg), role: 'p1' }],
      state: { title: 'Puzzle', question: `${p.hint}\n\nRéponse masquée : ${masked} (${p.answer.length} car.)`, readOnly: true, finished: false }
    });
    return replyText(sock, jid,
      `🧩 *Puzzle*\n💡 ${p.hint}\n\nRéponse masquée : \`${masked}\` (${p.answer.length} car.)\n_Devine dans le chat !_\n🔗 ${links.p1}`,
      msg
    );
  }
};
