const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "coinflip",
  category: "fun",
  description: "Pile ou face",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const result = Math.random() < 0.5 ? "Pile 🪙" : "Face 🪙";
    return replyText(sock, jid, result, msg);
  }
};
