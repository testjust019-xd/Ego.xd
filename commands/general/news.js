const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "news",
  category: "general",
  description: "Dernières actus — .news [sujet optionnel]",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    const url = query
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=CI&ceid=CI:fr`
      : `https://news.google.com/rss?hl=fr&gl=CI&ceid=CI:fr`;

    try {
      const res = await fetch(url);
      const xml = await res.text();

      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8);
      if (!items.length) {
        return replyText(sock, jid, "Aucune actu trouvée.", msg);
      }

      const headlines = items.map((match, i) => {
        const block = match[1];
        const title = block.match(/<title>(.*?)<\/title>/)?.[1] || "Sans titre";
        return `${i + 1}. ${title}`;
      }).join('\n');

      return replyText(sock, jid, `📰 *Actus${query ? ` — ${query}` : ''}*\n\n${headlines}`, msg);
    } catch (err) {
      console.error('[news] erreur:', err);
      return replyText(sock, jid, "Erreur en récupérant les actus.", msg);
    }
  }
};
