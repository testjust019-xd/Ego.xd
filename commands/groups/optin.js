const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const peopleDB = require('../../lib/peopleDB');

module.exports = {
  name: 'optin',
  category: 'groups',
  description: 'Rejoindre le pool Group Factory (éligible .getgroup)',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    peopleDB.ensure(sender, { session: 'main' });
    peopleDB.setOptIn(sender, true);
    return replyText(
      sock,
      jid,
      '✅ *OPT-IN*\nTu es dans le pool Group Factory.\nTu pourras être tiré par `.getgroup`.\nAnnuler : `.optout`',
      msg
    );
  }
};
