const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "groupinfo",
  category: "general",
  description: "Affiche les infos du groupe",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }

    const meta = await sock.groupMetadata(jid);
    const admins = meta.participants.filter(p => p.admin).length;

    const text = `📋 *${meta.subject}*\n` +
      `👥 Membres : ${meta.participants.length}\n` +
      `👑 Admins : ${admins}\n` +
      `📝 Description : ${meta.desc || "Aucune"}`;

    return replyText(sock, jid, text, msg);
  }
};
