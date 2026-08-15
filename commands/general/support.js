const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "support",
  category: "general",
  description: "Lien du groupe de support",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    return replyText(sock, jid, `💬 Groupe de support : ${config.supportGroupLink}`, msg);
  }
};
