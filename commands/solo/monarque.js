const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter } = require('../../lib/hunterDB');

module.exports = {
  name: 'monarque',
  category: 'solo',
  description: "Pouvoir du Monarque — réservé aux chasseurs S+ — .monarque",
  minRank: 'S', // 🔒 requiert au minimum le rang S

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const text =
      `👑 *Éveil du Monarque*\n\n` +
      `Rang : *${h.rank}*\n` +
      `Tu fais partie de l'élite absolue des chasseurs.\n\n` +
      `_「 Arise. 」_`;
    return replyText(sock, jid, text, msg);
  }
};
