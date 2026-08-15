const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { replyText, replyImage } = require('../../helpers/reply');
const { setSession, getSession, clearSession } = require('../../lib/play2Sessions');
const { getCookieArgs } = require('../../lib/ytDlpCookies');

const execFileAsync = util.promisify(execFile);
const SESSION_TTL_MS = 60000; // 60 secondes pour choisir

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
  name: "play2",
  category: "tools",
  description: "Recherche musicale avec plusieurs résultats + miniature — .play2 <titre>, puis .play2 <numero>",

  dailyLimit: true,
  // ⚠️ REQUIERT : yt-dlp et ffmpeg installés (pkg install ffmpeg && pip install yt-dlp)
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    // ─── Cas 1 : sélection d'un résultat déjà affiché (.play2 4) ───
    const maybeIndex = parseInt(args[0], 10);
    const session = getSession(jid);

    if (session && args.length === 1 && !isNaN(maybeIndex)) {
      const choice = session.results[maybeIndex - 1];

      if (!choice) {
        return replyText(sock, jid, `Choisis un numéro entre 1 et ${session.results.length}.`, msg);
      }

      clearSession(jid);
      await replyText(sock, jid, `⬇️ Téléchargement de "${choice.title}"...`, msg);

      const tempBase = path.join(os.tmpdir(), `play2_${Date.now()}_${Math.floor(Math.random() * 10000)}`);

      try {
        // Thumb YouTube standard
        const thumbUrl = `https://i.ytimg.com/vi/${choice.id}/hqdefault.jpg`;
        const thumb = await fetchThumb(thumbUrl);
        if (thumb) {
          await replyImage(sock, jid, thumb, `🎵 *${choice.title}*`, msg);
        }

        await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
          '-x', '--audio-format', 'mp3', '--max-filesize', '25M',
          '-o', `${tempBase}.%(ext)s`,
          `https://www.youtube.com/watch?v=${choice.id}`
        ]);

        const filePath = `${tempBase}.mp3`;
        if (!fs.existsSync(filePath)) {
          return replyText(sock, jid, "Le téléchargement a échoué.", msg);
        }

        const buffer = fs.readFileSync(filePath);
        await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
        try { fs.unlinkSync(filePath); } catch (_) {}
      } catch (err) {
        console.error('[play2] erreur téléchargement:', err.message);
        return replyText(sock, jid, "Erreur lors du téléchargement.", msg);
      }
      return;
    }

    // ─── Cas 2 : nouvelle recherche (.play2 die gazo) ───
    const query = args.join(' ');
    if (!query) {
      return replyText(sock, jid, "Écris un titre, ex: .play2 Die Gazo", msg);
    }

    await replyText(sock, jid, "🔎 Recherche en cours...", msg);

    try {
      const { stdout } = await execFileAsync('yt-dlp', [
        ...getCookieArgs(),
        '--flat-playlist', '--dump-json', `ytsearch15:${query}`
      ]);

      const lines = stdout.trim().split('\n').filter(Boolean);
      const results = lines
        .map(line => {
          try {
            const data = JSON.parse(line);
            return { id: data.id, title: data.title };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .slice(0, 15);

      if (!results.length) {
        return replyText(sock, jid, "Aucun résultat trouvé.", msg);
      }

      setSession(jid, results, SESSION_TTL_MS);

      const list = results.map((r, i) => `${i + 1}. ${r.title}`).join('\n');
      return replyText(
        sock, jid,
        `🎵 Résultats pour "${query}" :\n\n${list}\n\nRéponds avec .play2 <numero> dans les 60 secondes.`,
        msg
      );
    } catch (err) {
      console.error('[play2] erreur recherche:', err.message);
      return replyText(sock, jid, "Erreur : vérifie que yt-dlp est installé.", msg);
    }
  }
};
