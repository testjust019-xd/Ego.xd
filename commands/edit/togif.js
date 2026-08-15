const { replyText } = require('../../helpers/reply');
const { getQuotedMedia, videoToGif } = require('../../lib/mediaEdit');

module.exports = {
  name: 'togif',
  aliases: ['gif'],
  category: 'edit',
  description: 'Vidéo → GIF (max ~6s) — .togif (réponds à la vidéo)',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sec = Math.min(10, Math.max(1, parseInt(args[0], 10) || 6));
    try {
      const media = await getQuotedMedia(msg);
      if (!media || media.type !== 'video') {
        return replyText(sock, jid, 'Réponds à une *vidéo* avec `.togif` ou `.togif 4`.', msg);
      }
      await replyText(sock, jid, `🎞️ GIF (${sec}s)…`, msg);
      const out = await videoToGif(media.buffer, sec);
      // WhatsApp : gif via video gifPlayback ou document
      await sock.sendMessage(
        jid,
        { video: out, mimetype: 'video/mp4', gifPlayback: true, caption: `🎞️ GIF ~${sec}s` },
        { quoted: msg }
      ).catch(async () => {
        await sock.sendMessage(jid, {
          document: out,
          mimetype: 'image/gif',
          fileName: 'ego.gif'
        }, { quoted: msg });
      });
    } catch (err) {
      console.error('[togif]', err);
      return replyText(sock, jid, `❌ ${err.message}`, msg);
    }
  }
};
