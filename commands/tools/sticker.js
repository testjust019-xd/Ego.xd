const { downloadContentFromMessage } = require('baron-baileys-v2');
const { replySticker, replyText } = require('../../helpers/reply');

module.exports = {
  name: "sticker",
  category: "tools",
  description: "Convertit une image/vidéo (répondue) en sticker",

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const target = quoted || msg.message;

    const type = target?.imageMessage ? 'image'
      : target?.videoMessage ? 'video'
      : null;

    if (!type) {
      return replyText(sock, jid, "Réponds à une image ou vidéo avec .sticker", msg);
    }

    try {
      const stream = await downloadContentFromMessage(target[`${type}Message`], type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      // wa-sticker-formatter convertit correctement en WebP (avant, le
      // média brut était envoyé tel quel — ce n'était pas un vrai sticker)
      return replySticker(sock, jid, buffer, msg, { pack: "EGO.XD", author: "EGO.XD" });
    } catch (err) {
      console.error('[sticker] erreur:', err);
      return replyText(sock, jid, "Erreur en créant le sticker.", msg);
    }
  }
};
