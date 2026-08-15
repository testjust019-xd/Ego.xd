const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "listadmin",
  category: "groups",
  description: "Liste les admins du groupe",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, "Cette commande ne marche que dans un groupe.", msg);
    }

    const meta = await sock.groupMetadata(jid);
    const admins = meta.participants.filter(p => p.admin);

    if (!admins.length) {
      return replyText(sock, jid, "Aucun admin trouvé.", msg);
    }

    const list = admins.map(a => {
      const number = a.id.split('@')[0];
      const role = a.admin === 'superadmin' ? 'Créateur' : 'Admin';
      return `👑 ${number} (${role})`;
    }).join('\n');

    return replyText(sock, jid, `📋 *Admins de ${meta.subject}*\n\n${list}`, msg);
  }
};
