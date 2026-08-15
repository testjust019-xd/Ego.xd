const { replyText } = require('../../helpers/reply');
const { isSenderAdmin, getTargetJid } = require('../../lib/groupHelpers');

module.exports = {
  name: "demote",
  category: "groups",
  description: "Retire les droits admin d'un membre (admin) — réponds à son message",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }
    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .demote", msg);
    }

    const target = getTargetJid(msg);
    if (!target) {
      return replyText(sock, jid, "Réponds au message de la personne à rétrograder avec .demote", msg);
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], "demote");
      return replyText(sock, jid, "✅ Droits admin retirés.", msg);
    } catch (err) {
      console.error('[demote] erreur:', err);
      return replyText(sock, jid, "Erreur : vérifie que le bot est admin.", msg);
    }
  }
};
