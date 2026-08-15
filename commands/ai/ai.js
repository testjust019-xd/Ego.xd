const config = require('../../config');
const { getLocalAIResponse } = require('../../lib/localAI');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "ai",
  category: "ai",
  description: "Parle avec l'IA locale du bot (sans API externe)",

  minRank: 'C',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const question = args.join(' ');

    if (!question) {
      return replyText(sock, jid, "Écris quelque chose après .ai, par exemple : .ai salut", msg);
    }

    const response = getLocalAIResponse(question) || config.ai.fallbackMessage;
    return replyText(sock, jid, response, msg);
  }
};
