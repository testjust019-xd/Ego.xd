const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { createCode, parseDuration } = require('../../lib/redeemCodes');
const { RANKS } = require('../../lib/hunterDB');

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

/** Sépare les args restants en { maxUses, durationToken } quel que soit l'ordre */
function parseExtraArgs(rest) {
  let maxUses = 1;
  let durationToken = null;
  for (const tok of rest) {
    if (/^\d+$/.test(tok)) maxUses = parseInt(tok, 10);
    else if (parseDuration(tok) !== null) durationToken = tok;
  }
  return { maxUses, durationToken };
}

module.exports = {
  name: 'gencode',
  category: 'general',
  description:
    "Génère un code de rachat (owner uniquement) — .gencode xp <montant> [usages] [durée] | .gencode rank <rang> [usages] [durée]. Durée ex: 24h, 2j, 30m",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, "🔒 Seul le owner peut générer des codes.", msg);
    }

    const type = args[0]?.toLowerCase();
    const value = args[1];
    const { maxUses, durationToken } = parseExtraArgs(args.slice(2));
    const durationMs = durationToken ? parseDuration(durationToken) : null;
    const expiryLine = durationMs ? `⏳ Expire dans : ${durationToken}\n` : '';

    if (type === 'xp') {
      const amount = parseInt(value, 10);
      if (!amount || amount <= 0) {
        return replyText(
          sock, jid,
          "Utilisation : .gencode xp <montant> [usages] [durée]\nEx : .gencode xp 500 10 24h",
          msg
        );
      }
      const code = createCode({ xp: amount }, msg.key.participant || jid, { maxUses, durationMs });
      return replyText(
        sock, jid,
        `✅ Code créé !\n\n🎟️ *${code}*\n💠 Récompense : ${amount} XP\n🔁 Utilisations max : ${maxUses}\n${expiryLine}\n_À utiliser avec .redeem ${code}_`,
        msg
      );
    }

    if (type === 'rank') {
      const rank = RANKS.find(r => r.toLowerCase() === String(value || '').toLowerCase());
      if (!rank) {
        return replyText(
          sock, jid,
          `Utilisation : .gencode rank <rang> [usages] [durée]\nRangs valides : ${RANKS.join(', ')}`,
          msg
        );
      }
      const code = createCode({ rank }, msg.key.participant || jid, { maxUses, durationMs });
      return replyText(
        sock, jid,
        `✅ Code créé !\n\n🎟️ *${code}*\n💠 Récompense : rang *${rank}* direct\n🔁 Utilisations max : ${maxUses}\n${expiryLine}\n_À utiliser avec .redeem ${code}_`,
        msg
      );
    }

    return replyText(
      sock, jid,
      `Utilisation :\n.gencode xp <montant> [usages] [durée]\n.gencode rank <rang> [usages] [durée]\nDurée ex: 24h, 2j, 30m\n\nRangs valides : ${RANKS.join(', ')}`,
      msg
    );
  }
};
