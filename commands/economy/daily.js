const { getUser, updateUser } = require('../../lib/database');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h
const REWARD = 500;

module.exports = {
  name: "daily",
  category: "economy",
  description: "Récupère ta récompense quotidienne",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const user = getUser(senderJid);
    const now = Date.now();

    if (now - user.lastDaily < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - user.lastDaily);
      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      return replyText(sock, jid, `⏳ Reviens dans ${hours}h ${minutes}min pour ton prochain .daily`, msg);
    }

    updateUser(senderJid, { balance: user.balance + REWARD, lastDaily: now });
    return replyText(sock, jid, `🎁 Tu as reçu *${REWARD}* pièces ! Reviens demain pour plus.`, msg);
  }
};
