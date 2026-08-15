const { replyText } = require('../../helpers/reply');

const QUOTES = [
  "Arise.",
  "I alone level up.",
  "The weak have no rights. The strong take everything.",
  "I'm not a player who needs a party.",
  "Fear is just a tool.",
  "My shadows will handle it.",
  "You can't defeat me with numbers alone.",
  "This is the power of a Monarch.",
  "System notification: Quest complete.",
  "Even death cannot hold me.",
];

module.exports = {
  name: 'solobook',
  category: 'anime',
  description: 'Citation Solo Leveling aléatoire — .solobook',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    return replyText(sock, jid, `📖 *Solo Leveling*\n\n「 ${q} 」`, msg);
  }
};
