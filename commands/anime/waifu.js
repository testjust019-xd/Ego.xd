const { replyImage } = require('../../helpers/reply');

module.exports = {
  name: "waifu",
  category: "anime",
  description: "Image waifu aléatoire",

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    try {
      const res = await fetch("https://api.waifu.pics/sfw/waifu");
      const data = await res.json();
      return replyImage(sock, jid, { url: data.url }, "🌸 Waifu du moment", msg);
    } catch (err) {
      console.error('[waifu] erreur:', err);
      return sock.sendMessage(jid, { text: "Impossible de récupérer une image pour le moment." }, { quoted: msg });
    }
  }
};
