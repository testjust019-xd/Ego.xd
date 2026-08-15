const { replyImage, replyText } = require('../../helpers/reply');

module.exports = {
  name: "cat",
  category: "fun",
  description: "Photo de chat aléatoire",

  // thecatapi.com : utilisable gratuitement sans clé (avec limite de débit)
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch("https://api.thecatapi.com/v1/images/search");
      const data = await res.json();
      return replyImage(sock, jid, { url: data[0].url }, "🐱 Miaou !", msg);
    } catch (err) {
      return replyText(sock, jid, "Erreur, réessaie.", msg);
    }
  }
};
