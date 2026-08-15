const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');

module.exports = {
  name: "add",
  category: "moderation",
  description: "Ajoute un membre au groupe (admin) — .add <numero>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }

    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, "Seuls les admins peuvent utiliser .add", msg);
    }

    const number = args[0]?.replace(/[^0-9]/g, '');
    if (!number) {
      return replyText(sock, jid, "Donne un numéro international sans le +, ex: .add 2250000000000", msg);
    }

    const targetJid = `${number}@s.whatsapp.net`;

    try {
      await sock.groupParticipantsUpdate(jid, [targetJid], "add");
      return replyText(sock, jid, "✅ Invitation envoyée (dépend des paramètres de confidentialité de la personne).", msg);
    } catch (err) {
      console.error('[add] erreur:', err);
      return replyText(sock, jid, "Erreur : vérifie que le bot est bien admin du groupe.", msg);
    }
  }
};
