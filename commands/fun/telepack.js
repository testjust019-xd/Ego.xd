const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "telepack",
  category: "fun",
  description: "Affiche les infos d'un pack de stickers Telegram — .telepack <lien ou nom>",

  // Utilise l'API OFFICIELLE Telegram Bot (api.telegram.org), documentée et
  // stable — contrairement à la 1ère version qui pointait vers une API
  // tierce (tlgrm.eu) que je n'avais pas pu vérifier et qui ne répondait pas.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!args[0]) {
      return replyText(sock, jid, "❌ Utilisation : .telepack t.me/addstickers/NOM_DU_PACK", msg);
    }

    if (!config.telegram.botToken || config.telegram.botToken === "TON_TOKEN_BOTFATHER") {
      return replyText(sock, jid, "⚠️ Ajoute ton token Telegram Bot dans config.js (telegram.botToken). Crée-le gratuitement via @BotFather sur Telegram.", msg);
    }

    const packName = args[0].split('/').pop();

    try {
      const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/getStickerSet?name=${packName}`);
      const data = await res.json();

      if (!data.ok) {
        return replyText(sock, jid, `❌ Pack introuvable : ${data.description || "erreur inconnue"}`, msg);
      }

      const stickers = data.result.stickers;
      const text =
        `📦 *${data.result.title}*\n📸 ${stickers.length} stickers\n\n` +
        `Récupère avec :\n` +
        `• \`.teleget ${packName} <n|1-10|all>\` — stickers un par un\n` +
        `• \`.teleget2 ${packName}\` — pack WhatsApp natif (recommandé)\n` +
        `Ex: \`.teleget2 ${packName}\``;

      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[telepack] erreur:', err);
      return replyText(sock, jid, "❌ Erreur en contactant l'API Telegram.", msg);
    }
  }
};
