const { replyText } = require('../../helpers/reply');
const { isSenderAdmin, getTargetJid } = require('../../lib/groupHelpers');

module.exports = {
  name: "kick",
  category: "groups",
  description: "Expulse un membre (identique à .ban) — réponds à son message",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }
    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .kick", msg);
    }

    const target = getTargetJid(msg);
    if (!target) {
      return replyText(sock, jid, "Réponds au message de la personne à expulser avec .kick", msg);
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], "remove");
      return replyText(sock, jid, "✅ Membre expulsé.", msg);
    } catch (err) {
      console.error('[kick] erreur:', err);
      return replyText(sock, jid, "Erreur : vérifie que le bot est admin.", msg);
    }
  }
};
