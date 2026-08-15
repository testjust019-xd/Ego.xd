const { replyText, replyImage } = require('../../helpers/reply');
const { getQuotedMedia, extractFirstFrame } = require('../../lib/mediaEdit');

module.exports = {
  name: 'imgfirst',
  aliases: ['firstframe', 'framefirst'],
  category: 'edit',
  description: 'Première image d\'une vidéo (réponds à la vidéo) — .imgfirst',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const media = await getQuotedMedia(msg);
      if (!media || media.type !== 'video') {
        return replyText(sock, jid, 'Réponds à une *vidéo* avec `.imgfirst`.', msg);
      }
      await replyText(sock, jid, '🖼️ Extraction 1ère frame…', msg);
      const jpg = await extractFirstFrame(media.buffer);
      return replyImage(sock, jid, jpg, '🎬 Première frame', msg);
    } catch (err) {
      console.error('[imgfirst]', err);
      return replyText(sock, jid, `❌ Échec : ${err.message}\n_ffmpeg requis_`, msg);
    }
  }
};
