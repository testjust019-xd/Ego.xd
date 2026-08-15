const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getUser, updateUser } = require('../../lib/database');
const { createGameLink } = require('../../helpers/gameWeb');

module.exports = {
  name: 'roulette',
  category: 'games',
  description: 'Roulette rouge/noir/numéro — .roulette <mise> [rouge|noir|0-36]',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const mise = parseInt(args[0], 10);
    const bet = (args[1] || 'rouge').toLowerCase();
    if (!mise || mise < 1) return replyText(sock, jid, 'Ex: `.roulette 100 rouge` ou `.roulette 50 17`', msg);

    const user = getUser(sender);
    if ((user.balance || 0) < mise) return replyText(sock, jid, 'Solde insuffisant.', msg);

    const num = Math.floor(Math.random() * 37);
    const color = num === 0 ? 'vert' : (num % 2 === 0 ? 'noir' : 'rouge');
    let win = 0;
    if (bet === 'rouge' || bet === 'noir') {
      if (bet === color) win = mise * 2;
    } else if (/^\d+$/.test(bet)) {
      if (parseInt(bet, 10) === num) win = mise * 36;
    }

    const newBal = (user.balance || 0) - mise + win;
    updateUser(sender, { balance: newBal });

    let text = `🎰 *Roulette*\nNuméro : *${num}* (${color})\n`;
    text += win > 0 ? `✅ Gagné +${win - mise} (gain brut ${win})` : `❌ Perdu -${mise}`;
    text += `\n💰 Solde : ${newBal}`;

    const { links } = createGameLink({
      chatJid: jid,
      type: 'wheel',
      minRank: 'E',
      players: [{ jid: sender, role: 'p1' }],
      state: { stake: mise, bet, resultNumber: num, resultColor: color, win: win > 0 ? win - mise : 0 }
    });
    text += `\n🔗 Voir la roue : ${links.p1}`;

    return replyText(sock, jid, text, msg);
  }
};
