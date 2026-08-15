const config = require('../../config');
const { getLocalAIResponse } = require('../../lib/localAI');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "chat",
  category: "ai",
  description: "Discute avec l'IA locale (identique à .ai) — .chat <message>",

  minRank: 'D',
  dailyLimit: true,
  // Pour l'instant, fonctionnellement identique à .ai — juste un nom
  // différent pour ceux qui préfèrent "discuter" plutôt que "demander".
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const question = args.join(' ');

    if (!question) {
      return replyText(sock, jid, "Écris quelque chose, ex: .chat salut", msg);
    }

    const response = getLocalAIResponse(question) || config.ai.fallbackMessage;
    return replyText(sock, jid, response, msg);
  }
};
