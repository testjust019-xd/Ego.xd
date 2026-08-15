const { replyText } = require('../../helpers/reply');
const { getQuotedMedia, cutVideo, parseTime } = require('../../lib/mediaEdit');

module.exports = {
  name: 'cut',
  aliases: ['trim', 'coupe'],
  category: 'edit',
  description: 'Coupe une vidéo — réponds + .cut <début> <fin> | .cut <début> <durée>s',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    try {
      const media = await getQuotedMedia(msg);
      if (!media || media.type !== 'video') {
        return replyText(
          sock, jid,
          '✂️ *cut* — réponds à une vidéo\n\n' +
            '`.cut 0 10` — de 0s à 10s\n' +
            '`.cut 0:05 0:20` — de 5s à 20s\n' +
            '`.cut 5 15s` — 15 secondes à partir de 5s\n' +
            '`.cut 1:00 30s` — 30s à partir de 1min',
          msg
        );
      }

      if (args.length < 2) {
        return replyText(sock, jid, 'Usage : `.cut <début> <fin>` ou `.cut <début> <durée>s`', msg);
      }

      const start = parseTime(args[0]);
      let mode = 'end';
      let endOrDur = args[1];
      if (/s$/i.test(endOrDur)) {
        mode = 'duration';
        endOrDur = parseTime(endOrDur.replace(/s$/i, ''));
      } else {
        endOrDur = parseTime(endOrDur);
      }

      if (start == null || endOrDur == null) {
        return replyText(sock, jid, '❌ Temps invalide. Ex: `.cut 0 10` ou `.cut 5 15s`', msg);
      }

      await replyText(sock, jid, '✂️ Découpage…', msg);
      const out = await cutVideo(media.buffer, start, endOrDur, mode);
      if (out.length > 95 * 1024 * 1024) {
        return replyText(sock, jid, '❌ Fichier trop lourd après coupe (>95 Mo).', msg);
      }
      await sock.sendMessage(jid, { video: out, mimetype: 'video/mp4', caption: `✂️ ${args[0]} → ${args[1]}` }, { quoted: msg });
    } catch (err) {
      console.error('[cut]', err);
      return replyText(sock, jid, `❌ Échec : ${err.message}`, msg);
    }
  }
};
