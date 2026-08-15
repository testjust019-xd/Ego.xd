const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "wiki",
  category: "search",
  description: "Résumé Wikipedia sur un sujet — .wiki <sujet>",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return replyText(sock, jid, "Écris un sujet, ex: .wiki Côte d'Ivoire", msg);
    }

    try {
      const res = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('non trouvé');
      const data = await res.json();
      const extract = data.extract?.slice(0, 1500) || "Pas de résumé disponible.";
      return replyText(sock, jid, `📖 *${data.title}*\n\n${extract}`, msg);
    } catch (err) {
      return replyText(sock, jid, "Sujet introuvable sur Wikipedia.", msg);
    }
  }
};
