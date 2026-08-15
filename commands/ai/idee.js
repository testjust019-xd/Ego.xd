const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { chatWithFallback } = require('../../lib/aiHelper');

module.exports = {
  name: 'idee',
  category: 'ai',
  description: 'Génère des idées — .idee <sujet>',

  minRank: 'D',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const topic = args.join(' ').trim();
    if (!topic) {
      return replyText(sock, jid, 'Ex: `.idee posts Instagram pour un club de foot`', msg);
    }

    try {
      await replyText(sock, jid, '💡 Génération d\'idées…', msg);
      const { text: answer } = await chatWithFallback({
        senderJid,
        system: 'Tu proposes 6 à 8 idées concrètes, numérotées, en français, adaptées au contexte africain/francophone si pertinent.',
        user: topic,
        max_tokens: 700
      });
      return replyText(sock, jid, `💡 *Idées*\n\n${answer}`, msg);
    } catch (err) {
      console.error('[idee]', err.message);
      return replyText(sock, jid, '⚠️ Configure une clé IA dans config.js', msg);
    }
  }
};
