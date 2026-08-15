const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { createGameLink } = require('../../helpers/gameWeb');

module.exports = {
  name: 'combat',
  category: 'games',
  description: 'Duel texte animé — .combat @user',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      || msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (!target) return replyText(sock, jid, 'Mentionne quelqu\'un : `.combat @user`', msg);

    const a = String(sender).split('@')[0];
    const b = String(target).split('@')[0];
    const aWins = Math.random() > 0.5;
    const steps = [
      `⚔️ *${a}* défie *${b}* !`,
      `🌑 Les ombres s'assemblent…`,
      `💥 Échange de coups fulgurant !`,
      aWins
        ? `🏆 *${a}* l'emporte ! Victoire du Monarque.`
        : `🏆 *${b}* renverse le combat !`
    ];

    const { links } = createGameLink({
      chatJid: jid,
      type: 'battle',
      minRank: 'E',
      players: [{ jid: sender, role: 'p1' }, { jid: target, role: 'p2' }],
      state: {
        title: 'Combat',
        finished: true,
        winnerName: aWins ? a : b,
        p1: { name: a, hp: aWins ? 100 : 0 },
        p2: { name: b, hp: aWins ? 0 : 100 },
        log: steps
      }
    });

    for (const line of steps) {
      await replyText(sock, jid, line, msg);
      await new Promise(r => setTimeout(r, 800));
    }
    await replyText(sock, jid, `🔗 Revoir le combat animé : ${links.spectator}`, msg);
  }
};
