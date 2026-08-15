const { replyText } = require('../../helpers/reply');

const JOKES = [
  '— Pourquoi le code refuse de marcher ? — Il a besoin de café… et d\'un debugger.',
  'Un QA entre dans un bar. Bar. Baarr. Baaaar. Le dev : "c\'est pas reproductible".',
  '99 little bugs in the code, 99 bugs… take one down, patch it around, 127 bugs in the code.',
  'Ça compile. Ship it. (narrator: it did not work)',
  'Le vrai boss final : legacy code sans commentaires.',
  'console.log("pourquoi") — la prière du dev.',
];

module.exports = {
  name: 'bugfix',
  category: 'fun',
  description: 'Blague / citation code qui bug — .bugfix',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const j = JOKES[Math.floor(Math.random() * JOKES.length)];
    return replyText(sock, jid, `🐛 ${j}`, msg);
  }
};
