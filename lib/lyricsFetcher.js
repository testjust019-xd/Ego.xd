/**
 * Récupère des paroles via 2 sources publiques gratuites (sans clé).
 * Retourne { lyrics, title?, artist?, thumbnail? } ou null.
 */

async function tryLyricsOvh(artist, title) {
  try {
    const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
    const data = await res.json();
    if (!data.lyrics) return null;
    return { lyrics: data.lyrics, title, artist };
  } catch {
    return null;
  }
}

async function trySomeRandomApi(query) {
  try {
    const res = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`);
    const data = await res.json();
    if (!data.lyrics) return null;
    return {
      lyrics: data.lyrics,
      title: data.title || query,
      artist: data.author || data.artist || '',
      thumbnail: data.thumbnail?.genius || data.thumbnail || null
    };
  } catch {
    return null;
  }
}

/**
 * Récupère des paroles. Si artist+title sont fournis (cas .lyrics2, précis),
 * essaie lyrics.ovh en premier puis some-random-api.
 * Si seulement une requête libre est fournie (cas .lyrics), inverse l'ordre.
 * @returns {Promise<{lyrics:string,title?:string,artist?:string,thumbnail?:string}|null>}
 */
async function fetchLyrics({ artist, title, freeQuery } = {}) {
  if (artist && title) {
    const fromOvh = await tryLyricsOvh(artist, title);
    if (fromOvh) return fromOvh;

    const fromFallback = await trySomeRandomApi(`${title} ${artist}`);
    if (fromFallback) return fromFallback;

    return null;
  }

  if (freeQuery) {
    const fromApi = await trySomeRandomApi(freeQuery);
    if (fromApi) return fromApi;

    const parts = freeQuery.split(' ');
    if (parts.length >= 2) {
      const guessArtist = parts[0];
      const guessTitle = parts.slice(1).join(' ');
      const fromOvh = await tryLyricsOvh(guessArtist, guessTitle);
      if (fromOvh) return fromOvh;
    }

    return null;
  }

  return null;
}

module.exports = { fetchLyrics };
