const { replyText } = require('../../helpers/reply');
const groupsDB = require('../../lib/groupsDB');

module.exports = {
  name: 'groupinfo',
  aliases: ['ginfo'],
  category: 'groups',
  description: 'Infos d\'un groupe premium — .groupinfo EGO-XXXX',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const code = (args[0] || '').toUpperCase();
    let rec = code ? groupsDB.getByCode(code) : null;
    if (!rec && jid.endsWith('@g.us')) {
      rec = groupsDB.getByWaJid(jid);
    }
    if (!rec) {
      return replyText(sock, jid, 'Usage : `.groupinfo EGO-XXXX` (ou dans le groupe concerné).', msg);
    }
    const job = groupsDB.getJob(rec.id);
    const pending = job?.queue?.length ?? (rec.pending || []).length;
    const done = job?.done?.length ?? (rec.members || []).length;
    const text =
      `📋 *${rec.name}*\n` +
      `Code : *${rec.inviteCode}*\n` +
      `Status : *${rec.status}*\n` +
      `Source : ${rec.source}\n` +
      `Membres enregistrés : ${done}\n` +
      (pending ? `File restante : ${pending}\n` : '') +
      `Créé : ${new Date(rec.createdAt).toLocaleString('fr-FR')}`;
    return replyText(sock, jid, text, msg);
  }
};
