const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');

module.exports = {
  name: "revoke",
  category: "groups",
  description: "Réinitialise le lien d'invitation du groupe (admin)",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }
    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .revoke", msg);
    }

    try {
      const code = await sock.groupRevokeInvite(jid);
      return replyText(sock, jid, `✅ Nouveau lien : https://chat.whatsapp.com/${code}\n(l'ancien lien ne marche plus)`, msg);
    } catch (err) {
      console.error('[revoke] erreur:', err.message);
      return replyText(sock, jid, "Erreur : vérifie que le bot est admin.", msg);
    }
  }
};
