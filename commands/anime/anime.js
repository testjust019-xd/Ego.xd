const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'anime',
  category: 'anime',
  description: 'Fiche anime (Jikan/MAL) — .anime <titre>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const q = args.join(' ').trim();
    if (!q) return replyText(sock, jid, 'Ex: `.anime Solo Leveling`', msg);
    try {
      const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`);
      const data = await res.json();
      const a = data.data?.[0];
      if (!a) return replyText(sock, jid, 'Anime introuvable.', msg);
      let text = `📺 *${a.title}*\n`;
      if (a.title_japanese) text += `🇯🇵 ${a.title_japanese}\n`;
      text += `⭐ Score : ${a.score || '?'}\n`;
      text += `📺 Épisodes : ${a.episodes || '?'}\n`;
      text += `📅 ${a.year || a.aired?.from?.slice(0, 4) || '?'}\n`;
      text += `🏷 ${(a.genres || []).map(g => g.name).join(', ') || '?'}\n`;
      text += `📊 ${a.status || '?'}\n\n`;
      text += `_${(a.synopsis || '').slice(0, 500)}${(a.synopsis || '').length > 500 ? '…' : ''}_`;
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[anime]', err);
      return replyText(sock, jid, 'Erreur API Jikan.', msg);
    }
  }
};
