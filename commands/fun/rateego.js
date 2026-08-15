const { replyTextDecor } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

module.exports = {
  name: 'rateego',
  aliases: ['egoist'],
  category: 'fun',
  description: 'Note ton niveau d\'ego 0–100 — .rateego [@user]',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const mention =
      msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || sender;
    const score = Math.floor(Math.random() * 101);
    let label = 'E-Class Ego';
    if (score >= 95) label = '⚡ MONARCH EGO';
    else if (score >= 85) label = 'S-Class Egoist';
    else if (score >= 70) label = 'National Level';
    else if (score >= 50) label = 'A-Rank Hunger';
    else if (score >= 30) label = 'Awakening…';
    else label = 'NPC energy';

    const tag = '@' + String(mention).split('@')[0].split(':')[0];
    return replyTextDecor(
      sock, jid,
      `🔥 *EGO RATING*\n\n` +
        `${tag}\n` +
        `📊 Score : *${score}/100*\n` +
        `🏷 ${label}`,
      msg, [mention], 0.6, 'nagi', 0.35
    );
  }
};
