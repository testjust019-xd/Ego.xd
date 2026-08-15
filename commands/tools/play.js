const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { replyText, replyImage } = require('../../helpers/reply');
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
  name: "play",
  category: "tools",
  description: "Cherche et envoie l'audio d'une chanson + miniature — .play <titre>",

  minRank: 'E',
  dailyLimit: true,
  // ⚠️ REQUIERT : yt-dlp et ffmpeg installés sur l'appareil.
  // Sur Termux : pkg install ffmpeg && pip install yt-dlp
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return replyText(sock, jid, "Écris un titre, ex: .play Faded Alan Walker", msg);
    }

    const tempBase = path.join(os.tmpdir(), `play_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
    const outputTemplate = `${tempBase}.%(ext)s`;

    await replyText(sock, jid, "🔎 Recherche en cours...", msg);

    try {
      // Métadonnées (titre + thumbnail) sans télécharger le média
      let meta = null;
      try {
        const { stdout } = await execFileAsync('yt-dlp', [
          ...getCookieArgs(),
          '--dump-json', '--no-download', '--no-playlist',
          `ytsearch1:${query}`
        ], { maxBuffer: 5 * 1024 * 1024 });
        meta = JSON.parse(stdout.trim().split('\n')[0]);
      } catch (_) {}

      await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
        '-x',
        '--audio-format', 'mp3',
        '--max-filesize', '25M',
        '-o', outputTemplate,
        `ytsearch1:${query}`
      ]);

      const filePath = `${tempBase}.mp3`;

      if (!fs.existsSync(filePath)) {
        return replyText(sock, jid, "Impossible de trouver ou convertir cette chanson.", msg);
      }

      const buffer = fs.readFileSync(filePath);
      const title = meta?.title || query;
      const thumbUrl = meta?.thumbnail || meta?.thumbnails?.[meta.thumbnails?.length - 1]?.url;
      const thumb = await fetchThumb(thumbUrl);

      if (thumb) {
        await replyImage(sock, jid, thumb, `🎵 *${title}*`, msg);
      }

      await sock.sendMessage(jid, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: msg });

      try { fs.unlinkSync(filePath); } catch (_) {}
    } catch (err) {
      console.error('[play] erreur:', err.message);
      return replyText(sock, jid, "Erreur : vérifie que yt-dlp et ffmpeg sont installés (pkg install ffmpeg && pip install yt-dlp).", msg);
    }
  }
};
