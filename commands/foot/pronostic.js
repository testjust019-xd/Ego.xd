const { replyText } = require('../../helpers/reply');
const { chatWithFallback } = require('../../lib/aiHelper');
const { getSenderJid } = require('../../lib/senderUtils');

module.exports = {
  name: 'pronostic',
  category: 'foot',
  description: 'Pronostic IA sur un match — .pronostic <match>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const match = args.join(' ').trim();
    if (!match) return replyText(sock, jid, 'Ex: `.pronostic ASEC vs Africa United`', msg);

    try {
      await replyText(sock, jid, '🔮 Analyse en cours…', msg);
      const { text: answer } = await chatWithFallback({
        senderJid,
        system:
          'Tu es un analyste foot. Donne un pronostic court en français : ' +
          'score probable, % de chance, 2 arguments max. Max 10 lignes. Pas de paris.',
        user: `Pronostic pour : ${match}`,
        max_tokens: 400
      });
      return replyText(sock, jid, `🔮 *Pronostic*\n⚽ ${match}\n\n${answer}`, msg);
    } catch (err) {
      // fallback sans IA
      const scores = ['1-0', '2-1', '1-1', '0-0', '2-0', '3-1', '1-2'];
      const sc = scores[Math.floor(Math.random() * scores.length)];
      return replyText(sock, jid,
        `🔮 *Pronostic (mode local)*\n⚽ ${match}\n\nScore probable : *${sc}*\n_Configure une clé IA (Groq/Gemini) pour une analyse plus fine._`,
        msg
      );
    }
  }
};
