const { getLeaderboard } = require('../../lib/database');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "leaderboard",
  category: "economy",
  description: "Classement des plus riches",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const top = getLeaderboard(10);

    if (top.length === 0) {
      return replyText(sock, jid, "Personne n'a encore de solde. Utilise .daily pour commencer !", msg);
    }

    let text = "🏆 *CLASSEMENT — PLUS RICHES*\n\n";
    top.forEach((u, i) => {
      const number = u.jid.split('@')[0];
      text += `${i + 1}. ${number} — ${u.balance} pièces\n`;
    });

    return replyText(sock, jid, text, msg);
  }
};
