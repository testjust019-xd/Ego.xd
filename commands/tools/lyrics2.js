const { replyText, replyImage } = require('../../helpers/reply');
const { setSession, getSession, clearSession } = require('../../lib/lyrics2Sessions');
const { fetchLyrics } = require('../../lib/lyricsFetcher');

const SESSION_TTL_MS = 60000; // 60 secondes pour choisir

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
  name: "lyrics2",
  category: "tools",
  description: "Paroles avec plusieurs résultats + image — .lyrics2 <titre>, puis .lyrics2 <numero> (60s)",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    // ─── Cas 1 : sélection d'un résultat déjà affiché (.lyrics2 4) ───
    const maybeIndex = parseInt(args[0], 10);
    const session = getSession(jid);

    if (session && args.length === 1 && !isNaN(maybeIndex)) {
      const choice = session.results[maybeIndex - 1];

      if (!choice) {
        return replyText(sock, jid, `Choisis un numéro entre 1 et ${session.results.length}.`, msg);
      }

      clearSession(jid);

      try {
        const result = await fetchLyrics({ artist: choice.artist, title: choice.title });

        if (!result || !result.lyrics) {
          return replyText(sock, jid, "Paroles introuvables pour ce titre précis (essayé sur 2 sources).", msg);
        }

        const lyricsText = result.lyrics.length > 3500
          ? result.lyrics.slice(0, 3500) + "\n\n[...paroles tronquées]"
          : result.lyrics;

        const header = `🎵 *${choice.title}*\n👤 ${choice.artist}`;
        const thumb = await fetchThumb(result.thumbnail || choice.artwork);
        if (thumb) {
          await replyImage(sock, jid, thumb, header, msg);
          return replyText(sock, jid, lyricsText, msg);
        }

        return replyText(sock, jid, `${header}\n\n${lyricsText}`, msg);
      } catch (err) {
        console.error('[lyrics2] erreur récupération:', err);
        return replyText(sock, jid, "Erreur en récupérant les paroles.", msg);
      }
    }

    // ─── Cas 2 : nouvelle recherche (.lyrics2 die gazo) ───
    const query = args.join(' ');
    if (!query) {
      return replyText(sock, jid, "Écris un titre, ex: .lyrics2 Die Gazo", msg);
    }

    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=15`);
      const data = await res.json();

      const results = (data.results || [])
        .filter(r => r.trackName && r.artistName)
        .map(r => ({
          title: r.trackName,
          artist: r.artistName,
          artwork: r.artworkUrl100 ? r.artworkUrl100.replace('100x100bb', '600x600bb') : null
        }));

      if (!results.length) {
        return replyText(sock, jid, "Aucun résultat trouvé.", msg);
      }

      setSession(jid, results, SESSION_TTL_MS);

      const list = results.map((r, i) => `${i + 1}. ${r.title} — ${r.artist}`).join('\n');
      return replyText(
        sock, jid,
        `🎵 Résultats pour "${query}" :\n\n${list}\n\nRéponds avec .lyrics2 <numero> dans les 60 secondes.`,
        msg
      );
    } catch (err) {
      console.error('[lyrics2] erreur recherche:', err);
      return replyText(sock, jid, "Erreur en cherchant. Réessaie.", msg);
    }
  }
};
