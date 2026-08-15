const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');

module.exports = {
  name: "linkgc",
  category: "groups",
  description: "Affiche le lien d'invitation du groupe (admin)",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }
    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .linkgc", msg);
    }

    try {
      const code = await sock.groupInviteCode(jid);
      return replyText(sock, jid, `🔗 https://chat.whatsapp.com/${code}`, msg);
    } catch (err) {
      console.error('[linkgc] erreur:', err.message);
      return replyText(sock, jid, "Erreur : vérifie que le bot est admin.", msg);
    }
  }
};
