const { replyText, replyTextDecor, playSfx } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, addXp, updateHunter } = require('../../lib/hunterDB');
const { getUser, updateUser } = require('../../lib/database');

module.exports = {
  name: 'gate',
  category: 'anime',
  description: 'Porte aléatoire mini-event + loot — .gate',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const now = Date.now();
    if (h.lastGate && now - h.lastGate < 2 * 60 * 60 * 1000) {
      const m = Math.ceil((2 * 60 * 60 * 1000 - (now - h.lastGate)) / 60000);
      return replyText(sock, jid, `🚪 Prochaine porte dans ~${m} min.`, msg);
    }
    const ranks = ['E', 'D', 'C', 'B', 'A', 'S'];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const xp = 15 + ranks.indexOf(rank) * 20 + Math.floor(Math.random() * 30);
    const coins = 80 + ranks.indexOf(rank) * 100 + Math.floor(Math.random() * 200);
    const win = Math.random() > 0.2;
    updateHunter(sender, { lastGate: now, gates: (h.gates || 0) + 1 });
    if (!win) {
      await playSfx(sock, jid, 'fail', msg, 0.8);
      return replyTextDecor(
        sock, jid,
        `🚪 *Gate [${rank}]*\n\n⚠️ Porte instable — retraite forcée. Pas de loot.`,
        msg, null, 0.5, 'jinwoo', 0.25
      );
    }
    addXp(sender, xp);
    const u = getUser(sender);
    updateUser(sender, { balance: (u.balance || 0) + coins });
    await playSfx(sock, jid, 'gate', msg, 0.9);
    return replyTextDecor(
      sock, jid,
      `🚪 *Gate [${rank}] ouverte !*\n\n✅ Clear\n✨ +${xp} XP\n🪙 +${coins} pièces`,
      msg, null, 0.75, 'jinwoo', 0.35
    );
  }
};
