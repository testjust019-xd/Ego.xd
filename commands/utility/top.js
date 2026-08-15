const { replyText } = require('../../helpers/reply');
const config = require('../../config');
const { getLeaderboard } = require('../../lib/database');

module.exports = {
  name: 'top',
  aliases: ['leaderboard', 'classement'],
  category: 'utility',
  description: 'Classement points — .top',
  minRank: 'E',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const top = getLeaderboard(10);
    if (!top.length) return replyText(sock, jid, 'Classement vide.', msg);
    let text = '🏆 *TOP 10*\n\n';
    top.forEach((u, i) => {
      text += `${i + 1}. ${String(u.jid).split('@')[0]} — *${u.balance || 0}* pts\n`;
    });
    const base = (process.env.PUBLIC_URL || config.publicUrl || '').replace(/\/$/, '');
    if (base) text += `\n🔗 Version web : ${base}/top`;
    return replyText(sock, jid, text, msg);
  }
};
