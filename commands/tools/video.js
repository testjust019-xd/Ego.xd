const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { replyText } = require('../../helpers/reply');
const { getCookieArgs } = require('../../lib/ytDlpCookies');

const execFileAsync = util.promisify(execFile);

module.exports = {
  name: "video",
  category: "tools",
  description: "Télécharge une vidéo (TikTok, Instagram, Facebook, Twitter...) — .video <url>",

  dailyLimit: true,
  // ⚠️ REQUIERT : yt-dlp et ffmpeg (déjà nécessaires pour .play/.ytmp4)
  // yt-dlp supporte nativement des centaines de sites, pas juste YouTube —
  // marche pour la plupart des vidéos publiques (pas les comptes privés).
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !url.startsWith('http')) {
      return replyText(sock, jid, "Donne un lien valide, ex: .video https://tiktok.com/@user/video/...", msg);
    }

    const tempBase = path.join(os.tmpdir(), `video_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

    await replyText(sock, jid, "⬇️ Téléchargement en cours...", msg);

    try {
      await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
        '-f', 'mp4/best',
        '--max-filesize', '50M',
        '-o', `${tempBase}.%(ext)s`,
        url
      ]);

      const filePath = `${tempBase}.mp4`;
      if (!fs.existsSync(filePath)) {
        return replyText(sock, jid, "Téléchargement impossible (site non supporté, contenu privé, ou trop lourd).", msg);
      }

      const buffer = fs.readFileSync(filePath);
      await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4' }, { quoted: msg });
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('[video] erreur:', err.message);
      return replyText(sock, jid, "Erreur : lien non supporté, contenu indisponible, ou vérifie yt-dlp/ffmpeg.", msg);
    }
  }
};
