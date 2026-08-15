const fs = require('fs');
const path = require('path');

// Place ton fichier de cookies YouTube exporté ici : data/cookies.txt
// (ou colle son contenu dans la variable d'environnement YTDLP_COOKIES sur Render)
const COOKIES_PATH = path.join(__dirname, '..', 'data', 'cookies.txt');

let initialized = false;

/** Si YTDLP_COOKIES est défini et que le fichier n'existe pas encore, l'écrit sur disque. */
function ensureCookiesFile() {
  if (initialized) return;
  initialized = true;
  try {
    if (!fs.existsSync(COOKIES_PATH) && process.env.YTDLP_COOKIES) {
      fs.mkdirSync(path.dirname(COOKIES_PATH), { recursive: true });
      fs.writeFileSync(COOKIES_PATH, process.env.YTDLP_COOKIES, 'utf8');
      console.log('[ytDlpCookies] cookies.txt généré depuis YTDLP_COOKIES');
    }
  } catch (err) {
    console.error('[ytDlpCookies] échec écriture cookies.txt:', err.message);
  }
}

/**
 * Retourne ['--cookies', '<chemin>'] si le fichier de cookies existe,
 * sinon un tableau vide (yt-dlp fonctionne normalement, juste sans cookies).
 */
function getCookieArgs() {
  ensureCookiesFile();
  try {
    if (fs.existsSync(COOKIES_PATH)) {
      return ['--cookies', COOKIES_PATH];
    }
  } catch (_) {}
  return [];
}

module.exports = { getCookieArgs, COOKIES_PATH };
