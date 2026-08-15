const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { listCodes, deleteCode } = require('../../lib/redeemCodes');

function isOwner(msg) {
  if (msg.key && msg.key.fromMe) return true;
  const candidates = [
    msg.key?.participantPn,
    msg.key?.participantAlt,
    msg.key?.participant,
    msg.key?.remoteJidAlt,
    msg.key?.remoteJid
  ];
  for (const c of candidates) {
    const d = String(c || '').split(':')[0].replace(/@.*$/, '').replace(/[^0-9]/g, '');
    if (d && config.ownerNumbers.includes(d)) return true;
  }
  return false;
}

const STATUS_EMOJI = { active: '🟢', expired: '⌛', exhausted: '🔴' };

function formatReward(reward) {
  if (reward.xp) return `${reward.xp} XP`;
  if (reward.rank) return `rang ${reward.rank}`;
  return '?';
}

function formatExpiry(expiresAt) {
  if (!expiresAt) return 'sans expiration';
  const d = new Date(expiresAt);
  return `expire le ${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

module.exports = {
  name: 'codes',
  category: 'general',
  description: "Liste les codes de rachat (owner uniquement) — .codes [all] | .codes del <code>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, "🔒 Seul le owner peut consulter les codes.", msg);
    }

    // .codes del <code>
    if (args[0]?.toLowerCase() === 'del' && args[1]) {
      const removed = deleteCode(args[1]);
      return replyText(
        sock, jid,
        removed ? `🗑️ Code *${args[1].toUpperCase()}* supprimé.` : `❌ Code introuvable.`,
        msg
      );
    }

    const showAll = args[0]?.toLowerCase() === 'all';
    let codes = listCodes().sort((a, b) => b.createdAt - a.createdAt);

    if (!showAll) codes = codes.filter(c => c.status === 'active');

    if (codes.length === 0) {
      return replyText(
        sock, jid,
        showAll ? "Aucun code enregistré." : "Aucun code actif.\n_Utilise .codes all pour voir aussi les codes expirés/épuisés._",
        msg
      );
    }

    const lines = codes.map(c => {
      const buyer = c.restrictToJid ? `\n   👤 Réservé à : ${c.restrictToJid.split('@')[0]}` : '';
      const price = c.price ? `\n   💰 Prix : ${c.price}` : '';
      return (
        `${STATUS_EMOJI[c.status]} *${c.code}*\n` +
        `   🎁 ${formatReward(c.reward)}\n` +
        `   🔁 ${c.usedBy.length}/${c.maxUses} utilisé(s)\n` +
        `   🕐 ${formatExpiry(c.expiresAt)}` +
        buyer + price
      );
    });

    const header = showAll ? `📋 *Tous les codes* (${codes.length})\n\n` : `📋 *Codes actifs* (${codes.length})\n\n`;
    return replyText(sock, jid, header + lines.join('\n\n'), msg);
  }
};
