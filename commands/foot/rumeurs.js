const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "rumeurs",
  category: "foot",
  description: "Rumeurs football — .rumeurs [sujet]",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const subject = args.join(' ');
    const query = subject ? `rumeur transfert ${subject}` : 'rumeur transfert football';

    try {
      const res = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=CI&ceid=CI:fr`);
      const xml = await res.text();

      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8);
      if (!items.length) {
        return replyText(sock, jid, "Aucune rumeur trouvée.", msg);
      }

      const headlines = items.map((match, i) => {
        const title = match[1].match(/<title>(.*?)<\/title>/)?.[1] || "Sans titre";
        return `${i + 1}. ${title}`;
      }).join('\n');

      return replyText(sock, jid, `🗣 *Rumeurs${subject ? ` — ${subject}` : ''}*\n\n${headlines}\n\n⚠️ Ce sont des rumeurs, pas des infos confirmées.`, msg);
    } catch (err) {
      console.error('[rumeurs] erreur:', err);
      return replyText(sock, jid, "Erreur en récupérant les rumeurs.", msg);
    }
  }
};
