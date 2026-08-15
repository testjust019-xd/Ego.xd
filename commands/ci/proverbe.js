const { replyText } = require('../../helpers/reply');

const PROVERBS = [
  { t: 'C\'est celui qui est dans la case qui en sent la fumée.', s: 'On connaît mieux ses propres problèmes.' },
  { t: 'La chèvre broute là où elle est attachée.', s: 'Chacun profite de sa position.' },
  { t: 'On ne crache pas en l\'air.', s: 'Tes actes te reviennent.' },
  { t: 'Le crocodile qui dort n\'est pas mort.', s: 'Ne sous-estime pas l\'adversaire calme.' },
  { t: 'Petit à petit, l\'oiseau fait son nid.', s: 'La patience mène au résultat.' },
  { t: 'Quand les éléphants se battent, c\'est l\'herbe qui souffre.', s: 'Les conflits des puissants touchent les faibles.' },
  { t: 'La vérité est comme l\'huile : elle flotte toujours.', s: 'La vérité finit par se savoir.' },
  { t: 'Qui veut aller loin ménage sa monture.', s: 'Économise tes forces.' },
];

module.exports = {
  name: 'proverbe',
  category: 'ci',
  description: 'Proverbe africain aléatoire — .proverbe',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const p = PROVERBS[Math.floor(Math.random() * PROVERBS.length)];
    return replyText(sock, jid, `📜 *Proverbe*\n\n« ${p.t} »\n\n💡 _${p.s}_`, msg);
  }
};
