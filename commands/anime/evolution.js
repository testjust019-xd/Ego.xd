const { replyTextDecor } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, RANK_XP, RANKS } = require('../../lib/hunterDB');

module.exports = {
  name: 'evolution',
  category: 'anime',
  description: 'Progression visuelle de rang — .evolution',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const idx = RANKS.indexOf(h.rank);
    let bar = '';
    for (let i = 0; i < RANKS.length; i++) {
      bar += i <= idx ? '▰' : '▱';
    }
    const next = RANK_XP[Math.min(idx + 1, RANK_XP.length - 1)];
    let text = `🧬 *Évolution du chasseur*\n\n`;
    text += `Rang actuel : *${h.rank}*\n`;
    text += `XP : ${h.xp}\n`;
    text += `${bar}\n`;
    text += `E → D → C → B → A → S → National → Monarch\n`;
    if (idx < RANKS.length - 1) text += `\nProchain palier ~ ${next} XP`;
    return replyTextDecor(sock, jid, text, msg, null, 0.7, 'jinwoo');
  }
};
