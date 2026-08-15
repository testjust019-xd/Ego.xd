const { replyText } = require('../../helpers/reply');
const { isSenderAdmin, getTargetJid } = require('../../lib/groupHelpers');

module.exports = {
  name: "ban",
  category: "moderation",
  description: "Expulse un membre du groupe (admin) — réponds à son message avec .ban",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }

    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .ban", msg);
    }

    const target = getTargetJid(msg);
    if (!target) {
      return replyText(sock, jid, "Réponds au message de la personne à expulser avec .ban", msg);
    }

    try {
      await sock.groupParticipantsUpdate(jid, [target], "remove");
      return replyText(sock, jid, "✅ Membre expulsé.", msg);
    } catch (err) {
      console.error('[ban] erreur:', err);
      return replyText(sock, jid, "Erreur : vérifie que le bot est bien admin du groupe.", msg);
    }
  }
};
