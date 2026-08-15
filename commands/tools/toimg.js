const { downloadContentFromMessage } = require('baron-baileys-v2');
const { replyText } = require('../../helpers/reply');
const { simulatePresence } = require('../../helpers/presence');
const { trackMessage } = require('../../lib/messageTracker');

module.exports = {
  name: "toimg",
  category: "tools",
  description: "Convertit un sticker (répondu) en image",

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const target = quoted?.stickerMessage;

    if (!target) {
      return replyText(sock, jid, "Réponds à un sticker avec .toimg", msg);
    }

    try {
      const stream = await downloadContentFromMessage(target, 'sticker');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      await simulatePresence(sock, jid);
      const sent = await sock.sendMessage(jid, { image: buffer, caption: "🖼 Converti" }, { quoted: msg });
      trackMessage(jid, sent.key);
    } catch (err) {
      console.error('[toimg] erreur:', err);
      return replyText(sock, jid, "Erreur en convertissant le sticker.", msg);
    }
  }
};
