const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { replyText, replyImage, replyVideo } = require('../../helpers/reply');
const { getCookieArgs } = require('../../lib/ytDlpCookies');

const execFileAsync = util.promisify(execFile);

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
  name: "play3",
  category: "tools",
  description: "Cherche et envoie le clip vidéo d'une chanson — .play3 <titre>",

  dailyLimit: true,
  // ⚠️ REQUIERT : yt-dlp et ffmpeg
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return replyText(sock, jid, "Écris un titre, ex: .play3 Faded Alan Walker", msg);
    }

    const tempBase = path.join(os.tmpdir(), `play3_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
    const outputTemplate = `${tempBase}.%(ext)s`;

    await replyText(sock, jid, "🔎 Recherche du clip en cours...", msg);

    try {
      let meta = null;
      try {
        const { stdout } = await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
          '--dump-json', '--no-download', '--no-playlist',
          `ytsearch1:${query}`
        ], { maxBuffer: 5 * 1024 * 1024 });
        meta = JSON.parse(stdout.trim().split('\n')[0]);
      } catch (_) {}

      // Vidéo limitée en taille / qualité pour WhatsApp
      await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
        '-f', 'bv*[height<=720]+ba/b[height<=720]/best[height<=720]',
        '--merge-output-format', 'mp4',
        '--max-filesize', '50M',
        '-o', outputTemplate,
        `ytsearch1:${query}`
      ]);

      const candidates = [`${tempBase}.mp4`, `${tempBase}.webm`, `${tempBase}.mkv`];
      const filePath = candidates.find((p) => fs.existsSync(p));

      if (!filePath) {
        return replyText(sock, jid, "Impossible de télécharger le clip.", msg);
      }

      const buffer = fs.readFileSync(filePath);
      const title = meta?.title || query;
      const thumbUrl = meta?.thumbnail || meta?.thumbnails?.[meta.thumbnails?.length - 1]?.url;
      const thumb = await fetchThumb(thumbUrl);

      if (thumb) {
        await replyImage(sock, jid, thumb, `🎬 *${title}*`, msg);
      }

      await replyVideo(sock, jid, buffer, `🎬 ${title}`, msg);

      try { fs.unlinkSync(filePath); } catch (_) {}
    } catch (err) {
      console.error('[play3] erreur:', err.message);
      return replyText(sock, jid, "Erreur : vérifie yt-dlp/ffmpeg, ou le clip est trop lourd.", msg);
    }
  }
};
