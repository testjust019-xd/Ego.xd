const { replyText } = require('../../helpers/reply');
const { isOwner } = require('../../lib/groupHelpers');
const peopleDB = require('../../lib/peopleDB');
const config = require('../../config');
const { getSenderJid, digitsOnly } = require('../../lib/senderUtils');

function isStaff(msg, sock) {
  if (isOwner(msg, sock)) return true;
  const sender = digitsOnly(getSenderJid(sock, msg));
  return (config.staffNumbers || []).some((n) => digitsOnly(n) === sender);
}

module.exports = {
  name: 'pool',
  category: 'groups',
  description: 'Stats du pool Group Factory (staff)',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!isStaff(msg, sock)) {
      return replyText(sock, jid, 'Réservé staff / owner.', msg);
    }
    const s = peopleDB.poolStats();
    const topTags = Object.entries(s.tags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t, n]) => `• ${t} : ${n}`)
      .join('\n') || '—';
    return replyText(
      sock,
      jid,
      `📊 *POOL*\nFiches : ${s.total}\nOpt-in : *${s.optIn}*\n\nTags :\n${topTags}`,
      msg
    );
  }
};
