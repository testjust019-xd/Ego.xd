const { replyImage } = require('../../helpers/reply');

module.exports = {
  name: "kiss",
  category: "reactions",
  description: "Fais un bisou (image) — .kiss",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch("https://api.waifu.pics/sfw/kiss");
      const data = await res.json();
      return replyImage(sock, jid, { url: data.url }, "😘 Bisou envoyé !", msg);
    } catch (err) {
      return sock.sendMessage(jid, { text: "Erreur, réessaie plus tard." }, { quoted: msg });
    }
  }
};
