const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { chatWithFallback } = require('../../lib/aiHelper');

module.exports = {
  name: 'compare',
  category: 'ai',
  description: 'Compare 2 choses — .compare A vs B',

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const raw = args.join(' ').trim();
    if (!raw || !/vs|versus|contre/i.test(raw)) {
      return replyText(sock, jid, 'Ex: `.compare iPhone vs Samsung` ou `.compare ASEC vs Africa United`', msg);
    }

    try {
      await replyText(sock, jid, '⚖️ Comparaison…', msg);
      const { text: answer } = await chatWithFallback({
        senderJid,
        system:
          'Compare de façon structurée et neutre en français : points forts, points faibles, pour qui c\'est mieux. Max 15 lignes.',
        user: raw,
        max_tokens: 700
      });
      return replyText(sock, jid, `⚖️ *Comparaison*\n\n${answer}`, msg);
    } catch (err) {
      console.error('[compare]', err.message);
      return replyText(sock, jid, '⚠️ Configure une clé IA dans config.js', msg);
    }
  }
};
