const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "rate",
  category: "social",
  description: "Note un truc sur 100 (pour rire) — .rate <quelque chose>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const thing = args.join(' ');

    if (!thing) {
      return replyText(sock, jid, "Écris ce que tu veux noter, ex: .rate le café", msg);
    }

    // Génère un score stable pour la même entrée (pas totalement aléatoire à chaque fois)
    const seed = [...thing.toLowerCase()].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const score = seed % 101;

    return replyText(sock, jid, `📊 *${thing}* : ${score}/100`, msg);
  }
};
