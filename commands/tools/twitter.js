const { replyText } = require('../../helpers/reply');
const { downloadVideo } = require('../../lib/videoDownloader');

module.exports = {
  name: "twitter",
  category: "tools",
  description: "Télécharge une vidéo X/Twitter — .twitter <lien>",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !(url.includes('twitter.com') || url.includes('x.com'))) {
      return replyText(sock, jid, "Donne un lien X/Twitter valide.", msg);
    }

    await replyText(sock, jid, "⬇️ Téléchargement...", msg);

    try {
      const buffer = await downloadVideo(url);
      if (!buffer) return replyText(sock, jid, "Téléchargement impossible.", msg);
      await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4' }, { quoted: msg });
    } catch (err) {
      console.error('[twitter] erreur:', err.message);
      return replyText(sock, jid, "Erreur de téléchargement.", msg);
    }
  }
};
