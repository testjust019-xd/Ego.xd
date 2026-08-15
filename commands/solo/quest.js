const { replyTextDecor, playSfx } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, addXp, updateHunter } = require('../../lib/hunterDB');
const { getUser, updateUser } = require('../../lib/database');

const QUESTS = [
  { id: 'gate',   text: 'Ouvre une Gate (`.gate`)',           check: (h) => (h.gates || 0) > 0 },
  { id: 'shadow', text: 'Extrais une ombre (`.shadow`)',      check: (h) => (h.shadows || 0) > 0 },
  { id: 'arise',  text: 'Active le System (`.arise`)',        check: () => true },
  { id: 'grind',  text: 'Cumule 50 XP chasseur aujourd\'hui', check: null }
];

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

module.exports = {
  name: 'quest',
  aliases: ['dailyquest', 'quete'],
  category: 'solo',
  description: 'Quête journalière chasseur — .quest | .quest claim',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const day = todayKey();
    const sub = (args[0] || '').toLowerCase();

    if (!h.dailyQuest || h.dailyQuest.day !== day) {
      const q = QUESTS[Math.floor(Math.random() * QUESTS.length)];
      updateHunter(sender, {
        dailyQuest: { day, id: q.id, text: q.text, claimed: false, progressXp: 0 }
      });
      Object.assign(h, { dailyQuest: { day, id: q.id, text: q.text, claimed: false } });
    }

    const dq = h.dailyQuest;

    if (sub === 'claim' || sub === 'reclaim' || sub === 'prendre') {
      if (dq.claimed) {
        return replyTextDecor(sock, jid, '✅ Quête déjà réclamée aujourd\'hui. Reviens demain.', msg, null, 0.4, 'jinwoo', 0.2);
      }
      // Validation soft : claim libre 1×/jour pour engagement (anti-frustration)
      const xpGain = 25 + Math.floor(Math.random() * 30);
      const coins = 80 + Math.floor(Math.random() * 120);
      addXp(sender, xpGain);
      const u = getUser(sender);
      updateUser(sender, { balance: (u.balance || 0) + coins });
      updateHunter(sender, { dailyQuest: { ...dq, claimed: true } });
      await playSfx(sock, jid, 'levelup', msg, 0.7);
      return replyTextDecor(
        sock, jid,
        `📜 *Quête accomplie !*\n\n` +
          `▸ ${dq.text}\n\n` +
          `✨ +${xpGain} XP chasseur\n` +
          `🪙 +${coins} pièces\n\n` +
          `_Nouvelle quête demain._`,
        msg, null, 0.7, 'jinwoo', 0.4
      );
    }

    const status = dq.claimed ? '✅ Réclamée' : '🔓 Disponible — `.quest claim`';
    return replyTextDecor(
      sock, jid,
      `📜 *Quête du jour*\n\n` +
        `▸ ${dq.text}\n` +
        `Status : ${status}\n\n` +
        `_Terminee ? → .quest claim_`,
      msg, null, 0.55, 'jinwoo', 0.3
    );
  }
};
