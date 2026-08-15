const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { replyText } = require('../../helpers/reply');
const { getCookieArgs } = require('../../lib/ytDlpCookies');
const { formatYtError } = require('../../lib/ytError');

const execFileAsync = util.promisify(execFile);
const YOUTUBE_URL_REGEX = /(youtube\.com|youtu\.be)/i;

module.exports = {
  name: "ytmp4",
  category: "tools",
  description: "Télécharge une vidéo YouTube — .ytmp4 <url>",

  minRank: 'D',
  dailyLimit: true,
  // ⚠️ REQUIERT : yt-dlp et ffmpeg installés (pkg install ffmpeg && pip install yt-dlp)
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !YOUTUBE_URL_REGEX.test(url)) {
      return replyText(sock, jid, "Donne un lien YouTube valide, ex: .ytmp4 https://youtu.be/xxxx", msg);
    }

    const tempBase = path.join(os.tmpdir(), `ytmp4_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
    const outputTemplate = `${tempBase}.%(ext)s`;

    await replyText(sock, jid, "⬇️ Téléchargement de la vidéo en cours (peut prendre un moment)...", msg);

    try {
      await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
        '-f', 'mp4',
        '--max-filesize', '50M', // les vidéos WhatsApp ont une limite de taille, ajuste si besoin
        '-o', outputTemplate,
        url
      ]);

      const filePath = `${tempBase}.mp4`;
      if (!fs.existsSync(filePath)) {
        return replyText(sock, jid, "Le téléchargement a échoué (vidéo trop lourde ou format indisponible).", msg);
      }

      const buffer = fs.readFileSync(filePath);
      await sock.sendMessage(jid, {
        video: buffer,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('[ytmp4] erreur:', err.message);
      return replyText(sock, jid, formatYtError(err, "vidéo YouTube"), msg);
    }
  }
};
