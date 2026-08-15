const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { chatWithFallback } = require('../../lib/aiHelper');

module.exports = {
  name: 'corrige',
  category: 'ai',
  description: 'Corrige orthographe / style — .corrige <texte>',

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const quoted =
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
      msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text ||
      '';
    const text = (args.join(' ') || quoted).trim();

    if (!text) {
      return replyText(sock, jid, 'Ex: `.corrige Je sui allé au marcher hier`', msg);
    }

    try {
      await replyText(sock, jid, '✏️ Correction…', msg);
      const { text: answer } = await chatWithFallback({
        senderJid,
        system:
          'Corrige l\'orthographe, la grammaire et le style en français. ' +
          'Réponds avec : 1) le texte corrigé 2) une courte liste des corrections. Pas d\'intro.',
        user: text.slice(0, 4000),
        max_tokens: 600
      });
      return replyText(sock, jid, `✏️ *Correction*\n\n${answer}`, msg);
    } catch (err) {
      console.error('[corrige]', err.message);
      return replyText(sock, jid, '⚠️ Configure une clé IA (Groq/OpenRouter/Gemini) dans config.js', msg);
    }
  }
};
