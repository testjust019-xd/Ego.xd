/**
 * .meme [query] — meme aléatoire ou recherche
 * API publique : meme-api.com / imgflip (sans clé pour random)
 */
const { replyText, replyImage } = require('../../helpers/reply');

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'EGO.XD-Bot/3.2' },
    signal: AbortSignal.timeout(12000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

module.exports = {
  name: 'meme',
  aliases: ['memes', 'redditmeme'],
  category: 'fun',
  description: 'Meme aléatoire ou par sujet — .meme [sujet]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ').trim().toLowerCase();

    try {
      let url, title, postLink;

      if (query) {
        // Recherche via meme-api subreddit ou fallback random
        const data = await fetchJson(`https://meme-api.com/gimme/${encodeURIComponent(query)}`);
        if (!data?.url) throw new Error('Aucun meme pour ce sujet');
        url = data.url;
        title = data.title || query;
        postLink = data.postLink;
      } else {
        const data = await fetchJson('https://meme-api.com/gimme');
        url = data.url;
        title = data.title || 'Meme';
        postLink = data.postLink;
      }

      // Certains posts sont des vidéos/gif — on préfère les images
      if (url && (url.endsWith('.mp4') || url.endsWith('.gif'))) {
        // Retry once random
        const data2 = await fetchJson('https://meme-api.com/gimme');
        url = data2.url;
        title = data2.title || title;
        postLink = data2.postLink || postLink;
      }

      const caption = `😂 *${title}*` + (postLink ? `\n🔗 ${postLink}` : '');
      return replyImage(sock, jid, url, caption, msg);
    } catch (err) {
      console.error('[meme]', err.message);
      return replyText(
        sock,
        jid,
        `❌ Impossible de récupérer un meme pour le moment.\n_${err.message}_`,
        msg
      );
    }
  }
};
