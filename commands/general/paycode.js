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

function toJid(numberRaw) {
  const num = String(numberRaw || '').replace(/[^0-9]/g, '');
  if (num.length < 8) return null;
  return `${num}@s.whatsapp.net`;
}

module.exports = {
  name: 'paycode',
  category: 'general',
  description:
    "Génère un code payant réservé à un acheteur, APRÈS réception du paiement (owner uniquement) — " +
    ".paycode xp <montant> <numéro> <prix> [durée] | .paycode rank <rang> <numéro> <prix> [durée]. Durée par défaut : 48h",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, "🔒 Seul le owner peut générer des codes payants.", msg);
    }

    const type = args[0]?.toLowerCase();
    const value = args[1];
    const buyerNumber = args[2];
    const price = args[3];
    const durationToken = args[4];

    const buyerJid = toJid(buyerNumber);
    if (!buyerJid) {
      return replyText(
        sock, jid,
        "Numéro d'acheteur invalide.\n\n" +
        "Utilisation :\n.paycode xp <montant> <numéro> <prix> [durée]\n.paycode rank <rang> <numéro> <prix> [durée]\n" +
        "Ex : .paycode xp 1000 2250501020304 2000FCFA 48h",
        msg
      );
    }

    if (!price) {
      return replyText(
        sock, jid,
        "⚠️ Indique le prix payé pour garder une trace.\nEx : .paycode xp 1000 2250501020304 2000FCFA 48h",
        msg
      );
    }

    const durationMs = durationToken ? parseDuration(durationToken) : parseDuration('48h');
    const note = `Paiement reçu manuellement (${config.donateInfo})`;

    let reward, rewardLabel;

    if (type === 'xp') {
      const amount = parseInt(value, 10);
      if (!amount || amount <= 0) {
        return replyText(sock, jid, "Montant d'XP invalide.\nEx : .paycode xp 1000 2250501020304 2000FCFA 48h", msg);
      }
      reward = { xp: amount };
      rewardLabel = `${amount} XP`;
    } else if (type === 'rank') {
      const rank = RANKS.find(r => r.toLowerCase() === String(value || '').toLowerCase());
      if (!rank) {
        return replyText(sock, jid, `Rang invalide.\nRangs valides : ${RANKS.join(', ')}`, msg);
      }
      reward = { rank };
      rewardLabel = `rang ${rank} direct`;
    } else {
      return replyText(
        sock, jid,
        "Utilisation :\n.paycode xp <montant> <numéro> <prix> [durée]\n.paycode rank <rang> <numéro> <prix> [durée]\n" +
        `Rangs valides : ${RANKS.join(', ')}`,
        msg
      );
    }

    const code = createCode(reward, msg.key.participant || jid, {
      maxUses: 1,
      durationMs,
      restrictToJid: buyerJid,
      price,
      note
    });

    const expiryText = durationToken || '48h';

    // Confirmation au owner
    await replyText(
      sock, jid,
      `✅ Code payant créé pour ${buyerNumber}\n\n` +
      `🎟️ *${code}*\n💠 Récompense : ${rewardLabel}\n💰 Prix : ${price}\n` +
      `👤 Réservé à : ${buyerNumber}\n⏳ Expire dans : ${expiryText}\n\n` +
      `_N'oublie pas de lui envoyer ce code après vérification du paiement._`,
      msg
    );

    // Tentative d'envoi direct au client en DM (best effort, ignoré si échec)
    try {
      await sock.sendMessage(buyerJid, {
        text:
          `🎉 Merci pour ton paiement (${price}) !\n\n` +
          `Voici ton code de rachat :\n🎟️ *${code}*\n\n` +
          `Utilise *.redeem ${code}* pour recevoir : ${rewardLabel}\n` +
          `⏳ Ce code expire dans ${expiryText}, ne tarde pas.`
      });
    } catch (err) {
      console.error('[paycode] envoi DM échoué, à transmettre manuellement:', err.message);
    }

    return;
  }
};
