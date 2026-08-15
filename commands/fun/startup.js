const { replyText } = require('../../helpers/reply');

const IDEAS = [
  'Uber pour les vendeurs de pain de brousse — livraison en 3 min à moto.',
  'Tinder mais uniquement pour trouver un coéquipier de FIFA.',
  'Netflix des proverbes africains en stories de 15 secondes.',
  'Application qui traduit le nouchi en français corporate.',
  'Airbnb pour les chambres d\'étudiants pendant les vacances.',
  'OnlyFans… des recettes de placali.',
  'ChatGPT mais qui répond uniquement en citations Solo Leveling.',
  'Banque mobile qui te refuse le retrait si tu n\'as pas fait de sport.',
  'Marketplace de blazes WhatsApp premium.',
  'IA qui génère des excuses crédibles pour arriver en retard à Abidjan.',
];

module.exports = {
  name: 'startup',
  category: 'fun',
  description: 'Idée de startup aléatoire (parfois absurde) — .startup',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const idea = IDEAS[Math.floor(Math.random() * IDEAS.length)];
    return replyText(sock, jid, `🚀 *Startup idea*\n\n${idea}`, msg);
  }
};
