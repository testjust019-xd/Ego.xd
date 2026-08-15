const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { chatWithFallback } = require('../../lib/aiHelper');

module.exports = {
  name: 'histoire',
  category: 'ai',
  description: 'Génère une courte histoire — .histoire <thème>',

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const theme = args.join(' ').trim() || 'un chasseur de Solo Leveling à Abidjan';

    try {
      await replyText(sock, jid, '📖 Écriture…', msg);
      const { text: answer } = await chatWithFallback({
        senderJid,
        system:
          'Écris une courte histoire captivante en français (15-25 lignes max). Style immersif, fin claire.',
        user: `Thème : ${theme}`,
        max_tokens: 900,
        temperature: 0.85
      });
      return replyText(sock, jid, `📖 *Histoire*\n\n${answer}`, msg);
    } catch (err) {
      console.error('[histoire]', err.message);
      return replyText(sock, jid, '⚠️ Configure une clé IA dans config.js', msg);
    }
  }
};
