const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const peopleDB = require('../../lib/peopleDB');

module.exports = {
  name: 'optout',
  category: 'groups',
  description: 'Quitter le pool Group Factory',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    peopleDB.setOptIn(sender, false);
    return replyText(sock, jid, '✅ *OPT-OUT*\nTu es sorti du pool. Plus de tirages `.getgroup`.', msg);
  }
};
