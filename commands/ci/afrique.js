const { replyText } = require('../../helpers/reply');

const FACTS = [
  'L\'Afrique compte 54 pays reconnus par l\'ONU.',
  'Le nil est le plus long fleuve d\'Afrique (~6650 km).',
  'Le Sahara est le plus grand désert chaud du monde.',
  'La Côte d\'Ivoire est le 1er producteur mondial de cacao.',
  'Le kiswahili est parlé par plus de 100 millions de personnes.',
  'Madagascar abrite ~90 % d\'espèces endémiques.',
  'Le lac Victoria est le plus grand lac d\'Afrique.',
  'L\'Union africaine a son siège à Addis-Abeba.',
];

module.exports = {
  name: 'afrique',
  category: 'ci',
  description: 'Fait aléatoire sur l\'Afrique — .afrique',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const f = FACTS[Math.floor(Math.random() * FACTS.length)];
    return replyText(sock, jid, `🌍 *Afrique*\n\n${f}`, msg);
  }
};
