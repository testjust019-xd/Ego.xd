const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getHunter, addXp, updateHunter } = require('../../lib/hunterDB');
const { getUser, updateUser } = require('../../lib/database');
const { createGameLink } = require('../../helpers/gameWeb');

const GATES = [
  { rank: 'E', name: 'Donjon des rats', xp: [10, 25], coins: [50, 150], danger: 0.15 },
  { rank: 'D', name: 'Crypte oubliée', xp: [25, 50], coins: [100, 300], danger: 0.25 },
  { rank: 'C', name: 'Forêt des ombres', xp: [40, 80], coins: [200, 500], danger: 0.35 },
  { rank: 'B', name: 'Temple du roi démon', xp: [70, 120], coins: [400, 900], danger: 0.45 },
  { rank: 'A', name: 'Abysse rouge', xp: [100, 200], coins: [800, 1800], danger: 0.55 },
];

module.exports = {
  name: 'donjon',
  category: 'games',
  description: 'Raid solo quotidien — .donjon',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const h = getHunter(sender);
    const now = Date.now();
    if (h.lastGate && now - h.lastGate < 4 * 60 * 60 * 1000) {
      const left = Math.ceil((4 * 60 * 60 * 1000 - (now - h.lastGate)) / 60000);
      return replyText(sock, jid, `⏳ Prochain donjon dans ~${left} min.`, msg);
    }

    const gate = GATES[Math.floor(Math.random() * GATES.length)];
    const fail = Math.random() < gate.danger;
    updateHunter(sender, { lastGate: now, gates: (h.gates || 0) + 1 });

    if (fail) {
      const { links } = createGameLink({
      chatJid: jid,
        type: 'loot', minRank: 'E', players: [{ jid: sender, role: 'p1' }],
        state: { title: gate.name, items: [], resultText: '💀 Échec — retrait in extremis' }
      });
      return replyText(sock, jid,
        `🕳 *${gate.name}* [Rang ${gate.rank}]\n\n💀 Échec… Tu t'es retiré in extremis.\n_Pas de loot cette fois._\n🔗 ${links.p1}`,
        msg
      );
    }

    const xp = gate.xp[0] + Math.floor(Math.random() * (gate.xp[1] - gate.xp[0] + 1));
    const coins = gate.coins[0] + Math.floor(Math.random() * (gate.coins[1] - gate.coins[0] + 1));
    addXp(sender, xp);
    const user = getUser(sender);
    updateUser(sender, { balance: (user.balance || 0) + coins });

    const { links } = createGameLink({
      chatJid: jid,
      type: 'loot',
      minRank: 'E',
      players: [{ jid: sender, role: 'p1' }],
      state: { title: gate.name, items: [`✨ +${xp} XP`, `🪙 +${coins} pièces`], resultText: '✅ Victoire !' }
    });

    return replyText(sock, jid,
      `🕳 *${gate.name}* [Rang ${gate.rank}]\n\n` +
      `✅ Victoire !\n` +
      `✨ +${xp} XP chasseur\n` +
      `🪙 +${coins} pièces\n` +
      `_Cooldown 4h_\n` +
      `🔗 ${links.p1}`,
      msg
    );
  }
};
