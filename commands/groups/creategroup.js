const { replyText } = require('../../helpers/reply');
const { isOwner, getTargetJid } = require('../../lib/groupHelpers');
const { getSenderJid, digitsOnly } = require('../../lib/senderUtils');
const { createPremiumGroup, getSock } = require('../../lib/groupFactory');
const config = require('../../config');
const { getUserRank, meetsRank } = require('../../lib/rankGate');

function isStaff(msg, sock) {
  if (isOwner(msg, sock)) return true;
  const sender = digitsOnly(getSenderJid(sock, msg));
  return (config.staffNumbers || []).some((n) => digitsOnly(n) === sender);
}

module.exports = {
  name: 'creategroup',
  aliases: ['makegroup'],
  category: 'groups',
  description: 'Crée un groupe premium avec les @mentionnés — .creategroup "Nom" @a @b',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);

    if (!isStaff(msg, sock)) {
      try {
        const rank = getUserRank(sender);
        if (!meetsRank(rank, 'S')) {
          return replyText(sock, jid, '🔒 `.creategroup` réservé *rang S+* (ou staff / owner).\nTon rang : *' + rank + '*', msg);
        }
      } catch {
        return replyText(sock, jid, '🔒 Permission insuffisante.', msg);
      }
    }

    const factoryLimit = require('../../lib/factoryLimit');
    const lim = factoryLimit.check(sender, 4);
    if (!lim.ok) {
      return replyText(
        sock,
        jid,
        `⏳ Limite Group Factory : *4 / semaine*.\nDéjà utilisés : *${lim.used}/4*\nRéessai dans ~${lim.retryInHours} h.`,
        msg
      );
    }

    if (!getSock()) {
      return replyText(sock, jid, 'Bot principal pas prêt.', msg);
    }

    // mentions
    const ctx = msg.message?.extendedTextMessage?.contextInfo || {};
    const mentioned = ctx.mentionedJid || [];
    const nameParts = [];
    for (const a of args) {
      if (a.startsWith('@')) continue;
      nameParts.push(a);
    }
    let name = nameParts.join(' ').replace(/^["']|["']$/g, '').trim();
    if (!name) name = `EGO ${Date.now().toString(36).slice(-4)}`;

    if (!mentioned.length) {
      return replyText(
        sock,
        jid,
        'Usage : `.creategroup "Nom du groupe" @membre1 @membre2`\nLes mentionnés sont ajoutés tout de suite. Toi = admin à la fin du setup.',
        msg
      );
    }

    await replyText(sock, jid, `⚙️ Création de *${name}* (${mentioned.length} membres)…`, msg);

    try {
      // Pour creategroup manuel : on peut ajouter les mentions en immediate,
      // créateur toujours à la fin pour garder le style
      const rec = await createPremiumGroup({
        name,
        creatorJid: sender,
        queueJids: [],
        immediateJids: mentioned,
        source: 'creategroup',
        deferCreator: true
      });
      // pas de file → finalizeCreator déjà appelé si queue vide
      factoryLimit.record(sender);
      return replyText(
        sock,
        jid,
        `✅ Groupe *${name}*\nCode : *${rec.inviteCode}*\nMembres demandés : ${mentioned.length}\nTu es (ou seras) admin.\nQuota semaine : *${lim.used + 1}/4*`,
        msg
      );
    } catch (err) {
      console.error('[creategroup]', err);
      return replyText(sock, jid, `Erreur : ${err.message}`, msg);
    }
  }
};
