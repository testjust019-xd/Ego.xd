const { replyText, replyImage } = require('../../helpers/reply');
const { getQuotedMedia, extractLastFrame } = require('../../lib/mediaEdit');

module.exports = {
  name: 'imglast',
  aliases: ['lastframe', 'framelast'],
  category: 'edit',
  description: 'Dernière image d\'une vidéo (réponds à la vidéo) — .imglast',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const media = await getQuotedMedia(msg);
      if (!media || media.type !== 'video') {
        return replyText(sock, jid, 'Réponds à une *vidéo* avec `.imglast`.', msg);
      }
      await replyText(sock, jid, '🖼️ Extraction dernière frame…', msg);
      const jpg = await extractLastFrame(media.buffer);
      return replyImage(sock, jid, jpg, '🎬 Dernière frame', msg);
    } catch (err) {
      console.error('[imglast]', err);
      return replyText(sock, jid, `❌ Échec : ${err.message}\n_ffmpeg / ffprobe requis_`, msg);
    }
  }
};
