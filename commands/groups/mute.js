const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');

module.exports = {
  name: "mute",
  category: "groups",
  description: "Ferme le groupe : seuls les admins peuvent écrire (admin)",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }
    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .mute", msg);
    }

    try {
      await sock.groupSettingUpdate(jid, 'announcement');
      return replyText(sock, jid, "🔇 Groupe fermé : seuls les admins peuvent écrire.", msg);
    } catch (err) {
      console.error('[mute] erreur:', err);
      return replyText(sock, jid, "Erreur : vérifie que le bot est admin.", msg);
    }
  }
};
