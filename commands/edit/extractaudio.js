const { replyText } = require('../../helpers/reply');
const { getQuotedMedia, extractAudio } = require('../../lib/mediaEdit');

module.exports = {
  name: 'extractaudio',
  aliases: ['getaudio', 'tomp3', 'vtoa'],
  category: 'edit',
  description: 'Extrait l\'audio d\'une vidéo — .extractaudio (réponds à la vidéo)',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const media = await getQuotedMedia(msg);
      if (!media || media.type !== 'video') {
        return replyText(sock, jid, 'Réponds à une *vidéo* avec `.extractaudio`.', msg);
      }
      await replyText(sock, jid, '🎵 Extraction audio…', msg);
      const out = await extractAudio(media.buffer);
      await sock.sendMessage(jid, { audio: out, mimetype: 'audio/mpeg', ptt: false }, { quoted: msg });
    } catch (err) {
      console.error('[extractaudio]', err);
      return replyText(sock, jid, `❌ ${err.message}`, msg);
    }
  }
};
