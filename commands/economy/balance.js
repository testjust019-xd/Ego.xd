const { getUser } = require('../../lib/database');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

module.exports = {
  name: "balance",
  category: "economy",
  description: "Affiche ton solde",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const user = getUser(senderJid);
    return replyText(sock, jid, `💰 Ton solde : *${user.balance}* pièces\n⭐ XP : *${user.xp}*`, msg);
  }
};
