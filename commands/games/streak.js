const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { claimStreak, getStreak } = require('../../lib/streakDB');
const { getUser, updateUser } = require('../../lib/database');
const { addXp } = require('../../lib/hunterDB');

module.exports = {
  name: 'streak',
  category: 'games',
  description: 'Série de connexions quotidiennes — .streak',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const r = claimStreak(sender);
    if (r.already) {
      return replyText(sock, jid,
        `🔥 *Streak* : ${r.count} jour(s)\n🏆 Record : ${r.best}\n\n_Reviens demain pour continuer !_`,
        msg
      );
    }
    const bonus = Math.min(500, 50 + r.count * 25);
    const user = getUser(sender);
    updateUser(sender, { balance: (user.balance || 0) + bonus });
    addXp(sender, 5 + r.count);
    return replyText(sock, jid,
      `🔥 *Streak claim !*\n` +
      `📅 Série : *${r.count}* jour(s)\n` +
      `🏆 Record : ${r.best}\n` +
      `🪙 +${bonus} pièces\n` +
      `✨ +${5 + r.count} XP`,
      msg
    );
  }
};
