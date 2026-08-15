const { replyImage } = require('../../helpers/reply');

module.exports = {
  name: "pat",
  category: "reactions",
  description: "Fais une caresse sur la tête (image) — .pat",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch("https://api.waifu.pics/sfw/pat");
      const data = await res.json();
      return replyImage(sock, jid, { url: data.url }, "🤚 Petite caresse !", msg);
    } catch (err) {
      return sock.sendMessage(jid, { text: "Erreur, réessaie plus tard." }, { quoted: msg });
    }
  }
};
