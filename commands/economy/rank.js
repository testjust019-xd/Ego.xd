const { getUser } = require('../../lib/database');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

function xpToLevel(xp) {
  return Math.floor(Math.sqrt(xp / 10)) + 1;
}

module.exports = {
  name: "rank",
  category: "economy",
  description: "Affiche ton niveau basé sur ton XP",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const user = getUser(senderJid);
    const level = xpToLevel(user.xp);

    return replyText(sock, jid, `⭐ XP : ${user.xp}\n🏅 Niveau : ${level}`, msg);
  }
};
