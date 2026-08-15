const { replyImage, replyText } = require('../../helpers/reply');

module.exports = {
  name: "dog",
  category: "fun",
  description: "Photo de chien aléatoire",

  // dog.ceo : API publique gratuite, sans clé, très stable depuis des années
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch("https://dog.ceo/api/breeds/image/random");
      const data = await res.json();
      return replyImage(sock, jid, { url: data.message }, "🐶 Woof !", msg);
    } catch (err) {
      return replyText(sock, jid, "Erreur, réessaie.", msg);
    }
  }
};
