const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');

module.exports = {
  name: "unmute",
  category: "groups",
  description: "Rouvre le groupe : tout le monde peut écrire (admin)",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }
    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .unmute", msg);
    }

    try {
      await sock.groupSettingUpdate(jid, 'not_announcement');
      return replyText(sock, jid, "🔊 Groupe rouvert : tout le monde peut écrire.", msg);
    } catch (err) {
      console.error('[unmute] erreur:', err);
      return replyText(sock, jid, "Erreur : vérifie que le bot est admin.", msg);
    }
  }
};
