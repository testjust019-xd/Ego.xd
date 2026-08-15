const { getUser, updateUser } = require('../../lib/database');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

const COOLDOWN_MS = 60 * 60 * 1000; // 1h
const JOBS = [
  { text: "Tu as réparé un ordinateur", pay: 150 },
  { text: "Tu as livré des colis", pay: 100 },
  { text: "Tu as codé un bot toute la nuit", pay: 200 },
  { text: "Tu as coaché un match de foot", pay: 120 },
  { text: "Tu as vendu des stickers", pay: 80 }
];

module.exports = {
  name: "work",
  category: "economy",
  description: "Travaille pour gagner des pièces",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const user = getUser(senderJid);
    const now = Date.now();

    if (now - user.lastWork < COOLDOWN_MS) {
      const remaining = COOLDOWN_MS - (now - user.lastWork);
      const minutes = Math.ceil(remaining / (60 * 1000));
      return replyText(sock, jid, `⏳ Tu es fatigué, reviens dans ${minutes} min pour retravailler.`, msg);
    }

    const job = JOBS[Math.floor(Math.random() * JOBS.length)];
    updateUser(senderJid, { balance: user.balance + job.pay, lastWork: now });
    return replyText(sock, jid, `💼 ${job.text} et gagné *${job.pay}* pièces !`, msg);
  }
};
