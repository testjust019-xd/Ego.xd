const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { chatCompletion } = require('../../lib/aiHelper');

module.exports = {
  name: 'gemini',
  category: 'ai',
  description: 'Chat Google Gemini — .gemini <question>',

  minRank: 'B',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const question = args.join(' ').trim();

    if (!question) {
      return replyText(sock, jid,
        'Ex: `.gemini explique la photosynthèse`\n' +
        'Clé gratuite : https://aistudio.google.com/apikey\n' +
        'À coller dans `config.js` → `gemini.apiKey`',
        msg
      );
    }

    if (!config.gemini?.apiKey || config.gemini.apiKey === 'TA_CLE_GEMINI_ICI') {
      return replyText(sock, jid,
        '⚠️ Ajoute ta clé Gemini gratuite dans `config.js` → `gemini.apiKey`\n' +
        'https://aistudio.google.com/apikey',
        msg
      );
    }

    try {
      await replyText(sock, jid, '✨ Gemini…', msg);
      const answer = await chatCompletion({
        provider: 'gemini',
        senderJid,
        system:
          `Tu es l'assistant du bot WhatsApp ${config.botName || 'EGO.XD'}. ` +
          `Réponds toujours en français, de façon claire, complète et utile. ` +
          `Ne coupe jamais ta réponse au milieu d'une phrase. ` +
          `Si la question porte sur un numéro temporaire / tempmail / OTP, explique concrètement comment tester (où regarder les SMS, délais, limites) sans moraliser inutilement.`,
        user: question.slice(0, 8000),
        max_tokens: 4096
      });
      // WhatsApp limite ~65k caractères ; on garde une marge confortable
      let text = (answer || '').trim();
      if (!text) text = 'Pas de réponse de Gemini.';
      if (text.length > 4000) {
        // Découpe propre en plusieurs messages si trop long
        const parts = [];
        let remaining = text;
        while (remaining.length > 0) {
          if (remaining.length <= 3900) {
            parts.push(remaining);
            break;
          }
          let cut = remaining.lastIndexOf('\n', 3900);
          if (cut < 2000) cut = remaining.lastIndexOf('. ', 3900);
          if (cut < 2000) cut = 3900;
          parts.push(remaining.slice(0, cut + 1).trim());
          remaining = remaining.slice(cut + 1).trim();
        }
        for (let i = 0; i < parts.length; i++) {
          const prefix = parts.length > 1 ? `(${i + 1}/${parts.length})\n` : '';
          await replyText(sock, jid, prefix + parts[i], msg);
        }
        return;
      }
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[gemini]', err.message);
      return replyText(sock, jid, `Erreur Gemini : ${err.message}`, msg);
    }
  }
};
