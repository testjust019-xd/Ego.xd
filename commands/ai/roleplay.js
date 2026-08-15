const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { chatWithFallback } = require('../../lib/aiHelper');

module.exports = {
  name: 'roleplay',
  category: 'ai',
  description: 'RP court — .roleplay <personnage> | <message>',

  minRank: 'C',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const raw = args.join(' ').trim();

    if (!raw || !raw.includes('|')) {
      return replyText(sock, jid,
        '🎭 *Roleplay*\n\n' +
        '`.roleplay Sung Jin-Woo | Arise, mon ombre`\n' +
        '`.roleplay coach de foot | motive mon équipe`',
        msg
      );
    }

    const [persona, ...rest] = raw.split('|');
    const userMsg = rest.join('|').trim();
    if (!persona.trim() || !userMsg) {
      return replyText(sock, jid, 'Format : `.roleplay <personnage> | <message>`', msg);
    }

    try {
      await replyText(sock, jid, '🎭…', msg);
      const { text: answer } = await chatWithFallback({
        senderJid,
        system:
          `Tu incarnes strictement : ${persona.trim()}. ` +
          'Reste dans le personnage, réponds en français, 8 lignes max, immersif.',
        user: userMsg,
        max_tokens: 500,
        temperature: 0.9
      });
      return replyText(sock, jid, `🎭 *${persona.trim()}*\n\n${answer}`, msg);
    } catch (err) {
      console.error('[roleplay]', err.message);
      return replyText(sock, jid, '⚠️ Configure une clé IA dans config.js', msg);
    }
  }
};
