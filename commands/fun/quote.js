const { replyText } = require('../../helpers/reply');

const QUOTES = [
  "Arise. — Sung Jin-Woo",
  "Just eat and get healthy. — Itadori Yuji",
  "La discipline bat le talent quand le talent ne travaille pas.",
  "Chaque échec est une leçon, pas une fin.",
  "Le succès, c'est se lever une fois de plus qu'on ne tombe."
];

module.exports = {
  name: "quote",
  category: "fun",
  description: "Envoie une citation motivante",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    return replyText(sock, jid, `💬 ${quote}`, msg);
  }
};
