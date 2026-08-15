const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter } = require('../../lib/hunterDB');

module.exports = {
  name: 'arsenal',
  category: 'solo',
  description: "Arsenal d'ombres — réservé aux chasseurs C+ — .arsenal",
  minRank: 'C', // 🔒 requiert au minimum le rang C

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const text =
      `⚔️ *Arsenal d'ombres*\n\n` +
      `Rang : *${h.rank}*\n` +
      `Ombres actives : ${h.shadows || 0}\n\n` +
      `_Débloqué à partir du rang C. Continue à monter pour renforcer ton arsenal._`;
    return replyText(sock, jid, text, msg);
  }
};
