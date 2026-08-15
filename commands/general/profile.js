/**
 * .profile [@user] — profil unifié (économie + hunter + XP)
 */
const config = require('../../config');
const { replyTextDecor } = require('../../helpers/reply');
const { getUser } = require('../../lib/database');
const { getHunter } = require('../../lib/hunterDB');
const { getSenderJid } = require('../../lib/senderUtils');
const { getUserRank } = require('../../lib/rankGate');

function formatNum(n) {
  return Number(n || 0).toLocaleString('fr-FR');
}

module.exports = {
  name: 'profile',
  aliases: ['profil', 'me', 'level'],
  category: 'general',
  description: 'Profil joueur (coins, XP, rang hunter) — .profile [@user]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);

    // Cible : mention, reply, ou soi-même
    let target = sender;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    if (ctx?.mentionedJid?.length) {
      target = ctx.mentionedJid[0];
    } else if (ctx?.participant && msg.message?.extendedTextMessage?.text?.includes('@')) {
      target = ctx.participant;
    } else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
      // reply
      const q = msg.message.extendedTextMessage.contextInfo;
      if (q.participant) target = q.participant;
    }

    const num = String(target).replace(/@.*$/, '').split(':')[0];
    const user = getUser(target);
    const hunter = getHunter(target);
    const rank = getUserRank(target) || hunter.rank || 'E';

    const isSelf = target === sender;
    const title = isSelf ? 'TON PROFIL' : `PROFIL · @${num}`;

    let text =
      `╔══ [ ${title} ] ══╗\n` +
      `║  👤 @${num}\n` +
      `╚══════════════════╝\n\n`;

    text += `💰 *Économie*\n`;
    text += `   Coins : *${formatNum(user.balance)}*\n`;
    text += `   XP éco : *${formatNum(user.xp)}*\n`;
    if (user.cards?.length) text += `   Cartes : *${user.cards.length}*\n`;

    text += `\n🌑 *Hunter (Solo Leveling)*\n`;
    text += `   Rang : *${rank}*\n`;
    text += `   XP : *${formatNum(hunter.xp)}*\n`;
    text += `   Ombres : *${formatNum(hunter.shadows)}*\n`;
    text += `   Gates : *${formatNum(hunter.gates)}*\n`;
    if (hunter.skills?.length) {
      text += `   Skills : ${hunter.skills.slice(0, 5).join(', ')}${hunter.skills.length > 5 ? '…' : ''}\n`;
    }

    text += `\n▸ \`${config.prefix}daily\` · \`${config.prefix}work\` · \`${config.prefix}gate\``;

    return replyTextDecor(sock, jid, text, msg, null, 0.55, null);
  }
};
