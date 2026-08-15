const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "ship",
  category: "social",
  description: "Crée un nom de couple — .ship <nom1> <nom2>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (args.length < 2) {
      return replyText(sock, jid, "Donne deux noms, ex: .ship Marie Jean", msg);
    }

    const [name1, name2] = args;
    const half1 = name1.slice(0, Math.ceil(name1.length / 2));
    const half2 = name2.slice(Math.floor(name2.length / 2));
    const shipName = half1 + half2;

    return replyText(sock, jid, `🚢 ${name1} + ${name2} = *${shipName}*`, msg);
  }
};
