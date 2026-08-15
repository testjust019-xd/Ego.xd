const { replyText, playSfx } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getUser, updateUser } = require('../../lib/database');
const { createGameLink } = require('../../helpers/gameWeb');

const ICONS = ['🍒', '🍋', '🔔', '⭐', '7️⃣', '💎'];

module.exports = {
  name: 'slots',
  aliases: ['slot', 'machine'],
  category: 'games',
  description: 'Machine à sous — .slots [mise]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const user = getUser(sender);
    let bet = parseInt(args[0], 10);
    if (!bet || bet < 10) bet = 50;
    if (bet > 5000) bet = 5000;

    if ((user.balance || 0) < bet) {
      return replyText(sock, jid, `❌ Solde insuffisant (mise ${bet}, solde ${user.balance || 0}).`, msg);
    }

    const a = ICONS[Math.floor(Math.random() * ICONS.length)];
    const b = ICONS[Math.floor(Math.random() * ICONS.length)];
    const c = ICONS[Math.floor(Math.random() * ICONS.length)];

    let mult = 0;
    if (a === b && b === c) mult = a === '💎' ? 15 : a === '7️⃣' ? 10 : 5;
    else if (a === b || b === c || a === c) mult = 2;

    const win = mult > 0 ? bet * mult : 0;
    const delta = win - bet;
    updateUser(sender, { balance: (user.balance || 0) + delta });

    if (win > 0) await playSfx(sock, jid, 'success', msg, 0.5);
    else await playSfx(sock, jid, 'fail', msg, 0.35);

    const { links } = createGameLink({
      chatJid: jid,
      type: 'reels',
      players: [{ jid: sender, role: 'p1' }],
      state: { stake: bet, reels: [a, b, c], win: win > 0 ? win - bet : 0 }
    });

    return replyText(
      sock, jid,
      `🎰 *SLOTS*\n\n` +
        `│ ${a} │ ${b} │ ${c} │\n\n` +
        (win > 0
          ? `🎉 Gagné *${win}* pièces (×${mult}) !\n`
          : `💨 Perdu *${bet}* pièces.\n`) +
        `💰 Solde : *${(user.balance || 0) + delta}*\n` +
        `🔗 Voir les rouleaux : ${links.p1}`,
      msg
    );
  }
};
