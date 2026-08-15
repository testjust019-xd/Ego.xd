const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "id",
  category: "general",
  description: "Affiche l'ID de ce chat/groupe",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    return replyText(sock, jid, `🆔 ID de ce chat : ${jid}`, msg);
  }
};
