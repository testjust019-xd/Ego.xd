const { replyText, replyTextDecor, playSfx } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, addXp, updateHunter } = require('../../lib/hunterDB');
const { getUser, updateUser } = require('../../lib/database');

const RAIDS = [
  { name: 'Red Gate — Demon Castle', minRank: 'D', xp: [40, 90], coins: [150, 400], danger: 0.35 },
  { name: 'Ice Elf Stronghold', minRank: 'C', xp: [60, 120], coins: [200, 500], danger: 0.4 },
  { name: 'High Orcs Outpost', minRank: 'B', xp: [90, 160], coins: [300, 700], danger: 0.45 },
  { name: 'Architect\'s Trial', minRank: 'A', xp: [120, 220], coins: [500, 1000], danger: 0.5 }
];

const RANK_ORDER = ['E', 'D', 'C', 'B', 'A', 'S', 'National', 'Monarch'];
const CD = 6 * 60 * 60 * 1000; // 6h

module.exports = {
  name: 'raid',
  category: 'solo',
  description: 'Raid de donjon (risqué) — .raid',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const now = Date.now();

    if (h.lastRaid && now - h.lastRaid < CD) {
      const m = Math.ceil((CD - (now - h.lastRaid)) / 60000);
      return replyText(sock, jid, `🏰 Prochain raid dans ~${m} min.`, msg);
    }

    const myIdx = RANK_ORDER.indexOf(h.rank || 'E');
    const available = RAIDS.filter((r) => RANK_ORDER.indexOf(r.minRank) <= myIdx);
    const pool = available.length ? available : [RAIDS[0]];
    const raid = pool[Math.floor(Math.random() * pool.length)];

    updateHunter(sender, { lastRaid: now, raids: (h.raids || 0) + 1 });

    if (Math.random() < raid.danger) {
      await playSfx(sock, jid, 'fail', msg, 0.75);
      return replyTextDecor(
        sock, jid,
        `🏰 *${raid.name}*\n\n` +
          `💀 Échec du raid… L’équipe s’est repliée.\n` +
          `_Pas de loot. Cooldown 6h._`,
        msg, null, 0.5, 'jinwoo', 0.25
      );
    }

    const xp = raid.xp[0] + Math.floor(Math.random() * (raid.xp[1] - raid.xp[0] + 1));
    const coins = raid.coins[0] + Math.floor(Math.random() * (raid.coins[1] - raid.coins[0] + 1));
    addXp(sender, xp);
    const u = getUser(sender);
    updateUser(sender, { balance: (u.balance || 0) + coins });
    await playSfx(sock, jid, 'success', msg, 0.8);
    return replyTextDecor(
      sock, jid,
      `🏰 *${raid.name}*\n\n` +
        `✅ Raid clear !\n` +
        `✨ +${xp} XP\n` +
        `🪙 +${coins} pièces\n` +
        `_Cooldown 6h_`,
      msg, null, 0.7, 'jinwoo', 0.35
    );
  }
};
