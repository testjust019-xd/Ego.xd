const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'character',
  category: 'anime',
  description: 'Fiche personnage anime — .character <nom>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const q = args.join(' ').trim();
    if (!q) return replyText(sock, jid, 'Ex: `.character Sung Jin-Woo`', msg);
    try {
      const res = await fetch(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&limit=1`);
      const data = await res.json();
      const c = data.data?.[0];
      if (!c) return replyText(sock, jid, 'Personnage introuvable.', msg);
      let text = `👤 *${c.name}*\n`;
      if (c.name_kanji) text += `🇯🇵 ${c.name_kanji}\n`;
      text += `⭐ Favoris MAL : ${c.favorites || 0}\n\n`;
      text += `_${(c.about || 'Pas de bio.').slice(0, 600)}_`;
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[character]', err);
      return replyText(sock, jid, 'Erreur API Jikan.', msg);
    }
  }
};
