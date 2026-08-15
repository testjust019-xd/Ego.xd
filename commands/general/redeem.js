const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { redeemCode } = require('../../lib/redeemCodes');
const { addXp, updateHunter, RANKS, RANK_XP } = require('../../lib/hunterDB');

module.exports = {
  name: 'redeem',
  category: 'general',
  description: "Utilise un code de rachat pour gagner de l'XP ou un rang — .redeem <code>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const code = args[0];

    if (!code) {
      return replyText(sock, jid, "Utilisation : .redeem <code>\nEx : .redeem EGO-A1B2-C3D4", msg);
    }

    const result = redeemCode(code, sender);

    if (!result.ok) {
      const messages = {
        invalid: "❌ Code invalide.",
        expired: "⌛ Ce code a expiré.",
        already_used: "⚠️ Tu as déjà utilisé ce code.",
        exhausted: "⚠️ Ce code a atteint son nombre maximum d'utilisations.",
        not_allowed: "🚫 Ce code est réservé à un autre acheteur."
      };
      return replyText(sock, jid, messages[result.reason] || "❌ Impossible d'utiliser ce code.", msg);
    }

    const { reward } = result;

    if (reward.xp) {
      const h = addXp(sender, reward.xp);
      return replyText(
        sock, jid,
        `🎉 Code utilisé avec succès !\n\n💠 +${reward.xp} XP\n📊 XP total : ${h.xp}\n🏆 Rang : *${h.rank}*`,
        msg
      );
    }

    if (reward.rank && RANKS.includes(reward.rank)) {
      const targetIdx = RANKS.indexOf(reward.rank);
      const h = updateHunter(sender, { rank: reward.rank, xp: RANK_XP[targetIdx] });
      return replyText(
        sock, jid,
        `🎉 Code utilisé avec succès !\n\n🏆 Nouveau rang : *${h.rank}*\n_Félicitations, chasseur._`,
        msg
      );
    }

    return replyText(sock, jid, "✅ Code utilisé, mais aucune récompense reconnue.", msg);
  }
};
