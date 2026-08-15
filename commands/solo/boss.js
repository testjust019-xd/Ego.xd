const { replyText, replyTextDecor, playSfx } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, addXp, updateHunter } = require('../../lib/hunterDB');
const { getUser, updateUser } = require('../../lib/database');

const BOSSES = [
  { name: 'Igris the Red', hp: 100, xp: [30, 70], coins: [100, 250] },
  { name: 'Blood-Red Commander', hp: 150, xp: [50, 100], coins: [150, 350] },
  { name: 'Baran, Demon King', hp: 220, xp: [80, 150], coins: [250, 500] },
  { name: 'Architect', hp: 300, xp: [100, 200], coins: [400, 800] }
];

const CD = 3 * 60 * 60 * 1000;

module.exports = {
  name: 'boss',
  category: 'solo',
  description: 'Combat un boss (mini-jeu) — .boss',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const now = Date.now();
    if (h.lastBoss && now - h.lastBoss < CD) {
      const m = Math.ceil((CD - (now - h.lastBoss)) / 60000);
      return replyText(sock, jid, `👹 Prochain boss dans ~${m} min.`, msg);
    }

    const boss = BOSSES[Math.floor(Math.random() * BOSSES.length)];
    const playerPower = 40 + (h.xp || 0) / 50 + (h.shadows || 0) * 2;
    const roll = playerPower + Math.random() * 80;
    const win = roll >= boss.hp * 0.55;

    updateHunter(sender, { lastBoss: now });

    if (!win) {
      await playSfx(sock, jid, 'fail', msg, 0.7);
      return replyTextDecor(
        sock, jid,
        `👹 *${boss.name}*\n\n` +
          `⚔️ Ta puissance : ${Math.floor(roll)}\n` +
          `🛡 Boss : ${boss.hp}\n\n` +
          `💀 Défaite… Entraîne-toi et reviens.\n_Cooldown 3h_`,
        msg, null, 0.5, 'jinwoo', 0.25
      );
    }

    const xp = boss.xp[0] + Math.floor(Math.random() * (boss.xp[1] - boss.xp[0] + 1));
    const coins = boss.coins[0] + Math.floor(Math.random() * (boss.coins[1] - boss.coins[0] + 1));
    addXp(sender, xp);
    const u = getUser(sender);
    updateUser(sender, { balance: (u.balance || 0) + coins });
    await playSfx(sock, jid, 'levelup', msg, 0.75);
    return replyTextDecor(
      sock, jid,
      `👹 *${boss.name}*\n\n` +
        `⚔️ Puissance : ${Math.floor(roll)} vs ${boss.hp}\n` +
        `✅ *VICTOIRE*\n` +
        `✨ +${xp} XP · 🪙 +${coins}\n` +
        `_Cooldown 3h_`,
      msg, null, 0.75, 'jinwoo', 0.4
    );
  }
};
