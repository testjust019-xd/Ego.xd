const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "mercato",
  category: "foot",
  description: "Actus de transferts football — .mercato [sujet]",

  minRank: 'E',
  dailyLimit: true,
  // Réutilise le même flux RSS Google News que .news, avec une requête
  // orientée transferts/mercato.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const subject = args.join(' ');
    const query = subject ? `mercato transfert ${subject}` : 'mercato football transfert';

    try {
      const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=CI&ceid=CI:fr`);
      const xml = await res.text();

      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8);
      if (!items.length) {
        return replyText(sock, jid, "Aucune actu de mercato trouvée.", msg);
      }

      const headlines = items.map((match, i) => {
        const title = match[1].match(/<title>(.*?)<\/title>/)?.[1] || "Sans titre";
        return `${i + 1}. ${title}`;
      }).join('\n');

      return replyText(sock, jid, `🔄 *Mercato${subject ? ` — ${subject}` : ''}*\n\n${headlines}`, msg);
    } catch (err) {
      console.error('[mercato] erreur:', err);
      return replyText(sock, jid, "Erreur en récupérant les actus.", msg);
    }
  }
};
