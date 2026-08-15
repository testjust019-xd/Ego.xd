const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');

module.exports = {
  name: "refuser",
  category: "manager",
  description: "Refuse un défi PvP en attente contre toi — .refuser",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    const challenge = managerDB.getChallenge(senderJid);
    if (!challenge) {
      return replyText(sock, jid, "Tu n'as aucun défi en attente.", msg);
    }

    managerDB.deleteChallenge(senderJid);
    return replyText(sock, jid, "🚫 Défi refusé.", msg);
  }
};
