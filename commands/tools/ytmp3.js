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
  name: "ytmp3",
  category: "tools",
  description: "Télécharge l'audio d'une vidéo YouTube — .ytmp3 <url>",

  minRank: 'E',
  dailyLimit: true,
  // ⚠️ REQUIERT : yt-dlp et ffmpeg installés (pkg install ffmpeg && pip install yt-dlp)
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !YOUTUBE_URL_REGEX.test(url)) {
      return replyText(sock, jid, "Donne un lien YouTube valide, ex: .ytmp3 https://youtu.be/xxxx", msg);
    }

    const tempBase = path.join(os.tmpdir(), `ytmp3_${Date.now()}_${Math.floor(Math.random() * 10000)}`);
    const outputTemplate = `${tempBase}.%(ext)s`;

    await replyText(sock, jid, "⬇️ Téléchargement de l'audio en cours...", msg);

    try {
      await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
        '-x',
        '--audio-format', 'mp3',
        '--max-filesize', '25M',
        '-o', outputTemplate,
        url
      ]);

      const filePath = `${tempBase}.mp3`;
      if (!fs.existsSync(filePath)) {
        return replyText(sock, jid, "Le téléchargement a échoué (fichier introuvable après conversion).", msg);
      }

      const buffer = fs.readFileSync(filePath);
      await sock.sendMessage(jid, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: msg });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error('[ytmp3] erreur:', err.message);
      return replyText(sock, jid, formatYtError(err, "audio YouTube"), msg);
    }
  }
};
