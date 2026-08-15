const { replyImage, replyText } = require('../../helpers/reply');
const { getTargetJid } = require('../../lib/groupHelpers');
const { getSenderJid } = require('../../lib/senderUtils');

module.exports = {
  name: "avatar",
  category: "tools",
  description: "Récupère la photo de profil (la tienne, ou en reply à quelqu'un)",

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const target = getTargetJid(msg) || getSenderJid(sock, msg);

    try {
      const url = await sock.profilePictureUrl(target, 'image');
      return replyImage(sock, jid, { url }, "🖼 Photo de profil", msg);
    } catch (err) {
      return replyText(sock, jid, "Impossible de récupérer la photo (privée ou absente).", msg);
    }
  }
};
