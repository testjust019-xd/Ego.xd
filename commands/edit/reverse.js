const { replyText } = require('../../helpers/reply');
const { getQuotedMedia, reverseVideo } = require('../../lib/mediaEdit');

module.exports = {
  name: 'reverse',
  aliases: ['inverservid', 'rewind'],
  category: 'edit',
  description: 'Inverse une vidéo — .reverse (réponds à la vidéo)',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const media = await getQuotedMedia(msg);
      if (!media || media.type !== 'video') {
        return replyText(sock, jid, 'Réponds à une *vidéo* avec `.reverse`.', msg);
      }
      await replyText(sock, jid, '⏪ Inversion… (peut être long)', msg);
      const out = await reverseVideo(media.buffer);
      await sock.sendMessage(jid, { video: out, mimetype: 'video/mp4', caption: '⏪ Reversed' }, { quoted: msg });
    } catch (err) {
      console.error('[reverse]', err);
      return replyText(sock, jid, `❌ ${err.message}`, msg);
    }
  }
};
