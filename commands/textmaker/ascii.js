const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "ascii",
  category: "textmaker",
  description: "Encadre ton texte dans une bannière — .ascii <texte>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return replyText(sock, jid, "Écris un texte, ex: .ascii ARISE", msg);
    }

    const line = "─".repeat(text.length + 4);
    const banner = `╭${line}╮\n│  ${text.toUpperCase()}  │\n╰${line}╯`;

    return replyText(sock, jid, banner, msg);
  }
};
