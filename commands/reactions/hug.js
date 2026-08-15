const { replyImage } = require('../../helpers/reply');

module.exports = {
  name: "hug",
  category: "reactions",
  description: "Fais un câlin (image) — .hug",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch("https://api.waifu.pics/sfw/hug");
      const data = await res.json();
      return replyImage(sock, jid, { url: data.url }, "🤗 Câlin envoyé !", msg);
    } catch (err) {
      return sock.sendMessage(jid, { text: "Erreur, réessaie plus tard." }, { quoted: msg });
    }
  }
};
