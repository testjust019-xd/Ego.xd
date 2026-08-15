const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "staff",
  category: "general",
  description: "Liste les responsables du bot (owner + staff)",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    const owners = config.ownerNumbers.map(n => `👑 ${n} (owner)`);
    const staff = (config.staffNumbers || []).map(n => `🛡 ${n} (staff)`);
    const list = [...owners, ...staff].join('\n');

    return replyText(sock, jid, `📋 *Équipe du bot*\n\n${list}`, msg);
  }
};
