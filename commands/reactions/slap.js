const { replyImage } = require('../../helpers/reply');

module.exports = {
  name: "slap",
  category: "reactions",
  description: "Donne une claque (image) — .slap",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch("https://api.waifu.pics/sfw/slap");
      const data = await res.json();
      return replyImage(sock, jid, { url: data.url }, "👋 Baffe envoyée !", msg);
    } catch (err) {
      return sock.sendMessage(jid, { text: "Erreur, réessaie plus tard." }, { quoted: msg });
    }
  }
};
