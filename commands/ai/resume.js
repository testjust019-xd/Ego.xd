const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { chatWithFallback } = require('../../lib/aiHelper');

module.exports = {
  name: 'resume',
  category: 'ai',
  description: 'Résume un texte — .resume <texte> (ou réponds à un message)',

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
      return replyText(sock, jid, 'Colle un texte ou réponds à un message : `.resume`', msg);
    }

    try {
      await replyText(sock, jid, '📝 Résumé en cours…', msg);
      const { text: answer } = await chatWithFallback({
        senderJid,
        system: 'Tu résumes clairement en français, en 5 à 10 lignes max, sans fioritures.',
        user: text.slice(0, 6000),
        max_tokens: 500
      });
      return replyText(sock, jid, `📝 *Résumé*\n\n${answer}`, msg);
    } catch (err) {
      console.error('[resume]', err.message);
      return replyText(sock, jid,
        '⚠️ Aucune clé IA configurée (Groq / OpenRouter / Gemini) ou erreur API.\n' +
        'Configure au moins une clé dans `config.js`.',
        msg
      );
    }
  }
};
