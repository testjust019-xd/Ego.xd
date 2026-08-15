const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getTargetJid } = require('../../lib/groupHelpers');
const peopleDB = require('../../lib/peopleDB');
const { getUserRank } = require('../../lib/rankGate');

module.exports = {
  name: 'people',
  aliases: ['pprofile', 'annuaire'],
  category: 'groups',
  description: 'Fiche annuaire — .people [@user]',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const target = getTargetJid(msg) || sender;
    peopleDB.ensure(target);
    const p = peopleDB.get(target) || {};
    let rank = 'E';
    try { rank = getUserRank(target); } catch (_) {}
    const text =
      `👤 *ANNUAIRE*\n` +
      `ID : ${String(target).split('@')[0]}\n` +
      `Rang : *${rank}*\n` +
      `Pool : ${p.optIn ? '✅ opt-in' : '❌ opt-out'}\n` +
      `Tags : ${(p.tags || []).join(', ') || '—'}\n` +
      `Groupes EGO : ${(p.groups || []).length}`;
    return replyText(sock, jid, text, msg);
  }
};
