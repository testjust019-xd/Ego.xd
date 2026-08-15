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
  name: "op",
  category: "anime",
  description: "Télécharge l'opening d'un anime — .op <anime> ou .op mp3 <anime> (mp4 par défaut)",

  dailyLimit: true,
  // Pas d'API dédiée aux openings d'anime en libre accès — recherche
  // YouTube via yt-dlp (même méthode fiable que .play/.video), en ajoutant
  // "opening full" à la recherche. Peut parfois tomber sur un fan-cover ou
  // une mauvaise vidéo si le vrai titre de l'anime est ambigu.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    let format = 'mp4';
    let query = args.join(' ');

    if (args[0]?.toLowerCase() === 'mp3' || args[0]?.toLowerCase() === 'mp4') {
      format = args[0].toLowerCase();
      query = args.slice(1).join(' ');
    }

    if (!query) {
      return replyText(sock, jid, "Utilisation : .op <nom anime>\nOu : .op mp3 <nom anime>", msg);
    }

    const searchTerm = `${query} opening full`;
    const tempBase = path.join(os.tmpdir(), `op_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

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
      console.error('[op] erreur:', err.message);
      return replyText(sock, jid, formatYtError(err, "opening"), msg);
    }
  }
};
