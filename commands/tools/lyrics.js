const { replyText, replyImage } = require('../../helpers/reply');
const { fetchLyrics } = require('../../lib/lyricsFetcher');

async function fetchThumb(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ARISE-XD-Bot' }, redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 500) return null;
    return buf;
  } catch {
    return null;
  }
}

module.exports = {
  name: "lyrics",
  category: "tools",
  description: "Cherche les paroles d'une chanson (+ image si dispo) — .lyrics <titre>",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return replyText(sock, jid, "Écris un titre, ex: .lyrics Blinding Lights", msg);
    }

    try {
      const result = await fetchLyrics({ freeQuery: query });

      if (!result || !result.lyrics) {
        return replyText(sock, jid, "Paroles introuvables (essayé sur 2 sources). Essaie avec .lyrics2 pour choisir précisément le bon titre/artiste.", msg);
      }

      const header = result.artist
        ? `🎵 *${result.title || query}*\n👤 ${result.artist}`
        : `🎵 *${result.title || query}*`;

      const lyricsText = result.lyrics.length > 3500
        ? result.lyrics.slice(0, 3500) + "\n\n[...tronqué]"
        : result.lyrics;

      const thumb = await fetchThumb(result.thumbnail);
      if (thumb) {
        await replyImage(sock, jid, thumb, header, msg);
        return replyText(sock, jid, lyricsText, msg);
      }

      return replyText(sock, jid, `${header}\n\n${lyricsText}`, msg);
    } catch (err) {
      console.error('[lyrics] erreur:', err);
      return replyText(sock, jid, "Erreur en récupérant les paroles.", msg);
    }
  }
};
