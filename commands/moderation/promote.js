const { replyText } = require('../../helpers/reply');
const { isSenderAdmin, getTargetJid } = require('../../lib/groupHelpers');

module.exports = {
  name: "promote",
  category: "moderation",
  description: "Rend un membre admin (admin) — réponds à son message avec .promote",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }

    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .promote", msg);
    }

    const target = getTargetJid(msg);
    if (!target) {
      return replyText(sock, jid, "Réponds au message de la personne à promouvoir avec .promote", msg);
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], "promote");
      return replyText(sock, jid, "✅ Membre promu admin.", msg);
    } catch (err) {
      console.error('[promote] erreur:', err);
      return replyText(sock, jid, "Erreur : vérifie que le bot est bien admin du groupe.", msg);
    }
  }
};
