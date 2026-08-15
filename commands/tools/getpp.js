const { replyImage, replyText } = require('../../helpers/reply');
const { getTargetJid } = require('../../lib/groupHelpers');
const { getSenderJid } = require('../../lib/senderUtils');

module.exports = {
  name: "getpp",
  category: "tools",
  description: "Récupère une photo de profil — .getpp (toi), en reply, ou .getpp <numero>",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    let target;
    if (args[0]) {
      const number = args[0].replace(/[^0-9]/g, '');
      if (!number) {
        return replyText(sock, jid, "Numéro invalide. Ex: .getpp 2250000000000", msg);
      }
      target = `${number}@s.whatsapp.net`;
    } else {
      target = getTargetJid(msg) || getSenderJid(sock, msg);
    }

    try {
      const url = await sock.profilePictureUrl(target, 'image');
      return replyImage(sock, jid, { url }, "🖼 Photo de profil", msg);
    } catch (err) {
      return replyText(sock, jid, "Impossible de récupérer la photo (privée, absente, ou numéro invalide).", msg);
    }
  }
};
