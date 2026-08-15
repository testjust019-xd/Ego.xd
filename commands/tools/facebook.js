const { replyText } = require('../../helpers/reply');
const { downloadVideo } = require('../../lib/videoDownloader');

module.exports = {
  name: "facebook",
  category: "tools",
  description: "Télécharge une vidéo Facebook — .facebook <lien>",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url || !(url.includes('facebook.com') || url.includes('fb.watch'))) {
      return replyText(sock, jid, "Donne un lien Facebook valide.", msg);
    }

    await replyText(sock, jid, "⬇️ Téléchargement...", msg);

    try {
      const buffer = await downloadVideo(url);
      if (!buffer) return replyText(sock, jid, "Téléchargement impossible.", msg);
      await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4' }, { quoted: msg });
    } catch (err) {
      console.error('[facebook] erreur:', err.message);
      return replyText(sock, jid, "Erreur de téléchargement.", msg);
    }
  }
};
