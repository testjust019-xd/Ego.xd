const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "shorten",
  category: "tools",
  description: "Raccourcit un lien — .shorten <url>",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !url.startsWith('http')) {
      return replyText(sock, jid, "Donne un lien valide, ex: .shorten https://example.com", msg);
    }

    try {
      const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
      const shortUrl = await res.text();
      return replyText(sock, jid, `🔗 Lien raccourci : ${shortUrl}`, msg);
    } catch (err) {
      return replyText(sock, jid, "Erreur en raccourcissant le lien.", msg);
    }
  }
};
