const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "donate",
  category: "general",
  description: "Comment soutenir le développeur",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    return replyText(sock, jid, `❤️ Soutenir le développeur :\n${config.donateInfo}`, msg);
  }
};
