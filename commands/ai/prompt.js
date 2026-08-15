const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { chatWithFallback } = require('../../lib/aiHelper');

module.exports = {
  name: 'prompt',
  category: 'ai',
  description: 'Améliore un prompt IA — .prompt <idée brute>',

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const raw = args.join(' ').trim();
    if (!raw) {
      return replyText(sock, jid, 'Ex: `.prompt une image de lion cyberpunk`', msg);
    }

    try {
      await replyText(sock, jid, '🎯 Optimisation du prompt…', msg);
      const { text: answer } = await chatWithFallback({
        senderJid,
        system:
          'Tu es expert en prompt engineering. Transforme l\'idée en 2 prompts optimisés : ' +
          '1) pour chat LLM 2) pour génération d\'image. Français, clairs, prêts à copier.',
        user: raw,
        max_tokens: 600
      });
      return replyText(sock, jid, `🎯 *Prompts optimisés*\n\n${answer}`, msg);
    } catch (err) {
      console.error('[prompt]', err.message);
      return replyText(sock, jid, '⚠️ Configure une clé IA dans config.js', msg);
    }
  }
};
