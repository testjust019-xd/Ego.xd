const { replyText } = require('../../helpers/reply');

const ANSWERS = [
  "Oui, sans aucun doute.", "C'est certain.", "Probablement.",
  "Demande à nouveau plus tard.", "Difficile à dire pour l'instant.",
  "N'y compte pas trop.", "Non.", "Mes sources disent non.",
  "Concentre-toi et redemande."
];

module.exports = {
  name: "8ball",
  category: "fun",
  description: "Pose une question à la boule magique — .8ball <question>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      return replyText(sock, jid, "Pose une question, ex: .8ball je vais réussir ?", msg);
    }
    const answer = ANSWERS[Math.floor(Math.random() * ANSWERS.length)];
    return replyText(sock, jid, `🎱 ${answer}`, msg);
  }
};
