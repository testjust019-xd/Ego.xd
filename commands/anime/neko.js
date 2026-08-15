const { replyImage } = require('../../helpers/reply');

module.exports = {
  name: "neko",
  category: "anime",
  description: "Image neko aléatoire",

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    try {
      const res = await fetch("https://api.waifu.pics/sfw/neko");
      const data = await res.json();
      return replyImage(sock, jid, { url: data.url }, "🐱 Neko du moment", msg);
    } catch (err) {
      console.error('[neko] erreur:', err);
      return sock.sendMessage(jid, { text: "Impossible de récupérer une image pour le moment." }, { quoted: msg });
    }
  }
};
