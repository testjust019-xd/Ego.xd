const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { replyText } = require('../../helpers/reply');
const { getCookieArgs } = require('../../lib/ytDlpCookies');
const { formatYtError } = require('../../lib/ytError');

const execFileAsync = util.promisify(execFile);

module.exports = {
  name: "end",
  category: "anime",
  description: "Télécharge l'ending d'un anime — .end <anime> ou .end mp3 <anime> (mp4 par défaut)",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    let format = 'mp4';
    let query = args.join(' ');

    if (args[0]?.toLowerCase() === 'mp3' || args[0]?.toLowerCase() === 'mp4') {
      format = args[0].toLowerCase();
      query = args.slice(1).join(' ');
    }

    if (!query) {
      return replyText(sock, jid, "Utilisation : .end <nom anime>\nOu : .end mp3 <nom anime>", msg);
    }

    const searchTerm = `${query} ending full`;
    const tempBase = path.join(os.tmpdir(), `end_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

    await replyText(sock, jid, `🔎 Recherche de "${searchTerm}"...`, msg);

    try {
      if (format === 'mp3') {
        await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
          '-x', '--audio-format', 'mp3', '--max-filesize', '25M',
          '-o', `${tempBase}.%(ext)s`, `ytsearch1:${searchTerm}`
        ]);
        const filePath = `${tempBase}.mp3`;
        if (!fs.existsSync(filePath)) return replyText(sock, jid, "Introuvable.", msg);
        const buffer = fs.readFileSync(filePath);
        await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
        fs.unlinkSync(filePath);
      } else {
        await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
          '-f', 'mp4/best', '--max-filesize', '50M',
          '-o', `${tempBase}.%(ext)s`, `ytsearch1:${searchTerm}`
        ]);
        const filePath = `${tempBase}.mp4`;
        if (!fs.existsSync(filePath)) return replyText(sock, jid, "Introuvable.", msg);
        const buffer = fs.readFileSync(filePath);
        await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4' }, { quoted: msg });
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error('[end] erreur:', err.message);
      return replyText(sock, jid, formatYtError(err, "ending"), msg);
    }
  }
};
