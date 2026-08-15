const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "love",
  category: "fun",
  description: "Calcule un pourcentage de compatibilité — .love <nom1> <nom2>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (args.length < 2) {
      return replyText(sock, jid, "Donne deux noms, ex: .love Marie Jean", msg);
    }

    const [name1, name2] = args;
    // Génère un pourcentage stable pour la même paire de noms (pas totalement aléatoire)
    const seed = [...`${name1.toLowerCase()}${name2.toLowerCase()}`].reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const percent = seed % 101;

    let comment;
    if (percent > 80) comment = "C'est écrit dans les étoiles ✨";
    else if (percent > 50) comment = "Il y a du potentiel 👀";
    else if (percent > 20) comment = "Ça pourrait marcher avec des efforts 💪";
    else comment = "Mieux vaut rester amis 😅";

    return replyText(sock, jid, `💘 ${name1} + ${name2} = ${percent}%\n${comment}`, msg);
  }
};
