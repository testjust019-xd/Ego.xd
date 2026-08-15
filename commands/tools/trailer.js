const { downloadVideo } = require('../../lib/videoDownloader');
const { execFile } = require('child_process');
const util = require('util');
const { replyText } = require('../../helpers/reply');
const { getCookieArgs } = require('../../lib/ytDlpCookies');

const execFileAsync = util.promisify(execFile);

module.exports = {
  name: "trailer",
  category: "tools",
  description: "Bande-annonce d'un film/série — .trailer <titre>",

  dailyLimit: true,
  // Même méthode que .op/.end : recherche YouTube via yt-dlp, pas d'API
  // dédiée fiable et gratuite pour les bandes-annonces spécifiquement.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return replyText(sock, jid, "Écris un titre, ex: .trailer Dune 2", msg);
    }

    await replyText(sock, jid, `🔎 Recherche de "${query} trailer"...`, msg);

    try {
      const { stdout } = await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
        '--print', 'webpage_url',
        '--max-downloads', '1',
        `ytsearch1:${query} official trailer`
      ]);
      const url = stdout.trim().split('\n')[0];

      const buffer = await downloadVideo(url);
      if (!buffer) return replyText(sock, jid, "Bande-annonce introuvable.", msg);

      await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4' }, { quoted: msg });
    } catch (err) {
      console.error('[trailer] erreur:', err.message);
      return replyText(sock, jid, "Erreur : vérifie yt-dlp/ffmpeg, ou reformule le titre.", msg);
    }
  }
};
