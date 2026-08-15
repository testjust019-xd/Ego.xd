const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const peopleDB = require('../../lib/peopleDB');

module.exports = {
  name: 'settag',
  aliases: ['tags'],
  category: 'groups',
  description: 'Définir tes tags — .settag foot,ci,blue-lock',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const raw = args.join(' ').trim();
    if (!raw) {
      const p = peopleDB.get(sender);
      const tags = p?.tags?.length ? p.tags.join(', ') : '(aucun)';
      return replyText(sock, jid, `Tags actuels : *${tags}*\nUsage : \`.settag foot,ci\``, msg);
    }
    const tags = raw.split(/[,\s]+/).filter(Boolean);
    const p = peopleDB.setTags(sender, tags);
    return replyText(sock, jid, `✅ Tags : *${(p.tags || []).join(', ') || '(aucun)'}*`, msg);
  }
};
