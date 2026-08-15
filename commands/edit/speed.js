const { replyText } = require('../../helpers/reply');
const { getQuotedMedia, speedVideo } = require('../../lib/mediaEdit');

module.exports = {
  name: 'speed',
  aliases: ['vitessemedia', 'vspeed'],
  category: 'edit',
  description: 'Change la vitesse d\'une vidéo — .speed <0.5|1.5|2> (réponds à la vidéo)',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const factor = parseFloat(args[0]);
    if (!factor || factor < 0.25 || factor > 4) {
      return replyText(sock, jid, 'Usage : réponds à une vidéo + `.speed 2` (0.25–4)', msg);
    }
    try {
      const media = await getQuotedMedia(msg);
      if (!media || media.type !== 'video') {
        return replyText(sock, jid, 'Réponds à une *vidéo* avec `.speed <facteur>`.', msg);
      }
      await replyText(sock, jid, `⚡ Vitesse ×${factor}…`, msg);
      const out = await speedVideo(media.buffer, factor);
      await sock.sendMessage(jid, { video: out, mimetype: 'video/mp4', caption: `⚡ ×${factor}` }, { quoted: msg });
    } catch (err) {
      console.error('[speed]', err);
      return replyText(sock, jid, `❌ ${err.message}`, msg);
    }
  }
};
