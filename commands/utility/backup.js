const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const config = require('../../config');
const { createBackup, listBackups } = require('../../lib/backup');
const { log } = require('../../lib/logger');

function isOwner(jid) {
  const num = String(jid).replace(/@.*/, '').replace(/\D/g, '');
  return (config.ownerNumbers || []).map(String).includes(num);
}

module.exports = {
  name: 'backup',
  category: 'utility',
  description: 'Backup data — .backup / .backup list',
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    if (!isOwner(sender)) return replyText(sock, jid, '⛔ Owner only.', msg);
    if ((args[0] || '').toLowerCase() === 'list') {
      const files = listBackups();
      return replyText(sock, jid, files.length ? `📁 *Backups*\n${files.slice(0, 15).map(f=>'• '+f).join('\n')}` : 'Aucun backup.', msg);
    }
    try {
      const dest = createBackup();
      log.system.info('backup créé', dest);
      return replyText(sock, jid, `✅ Backup créé :\n\`${String(dest).split('/').pop()}\``, msg);
    } catch (e) {
      return replyText(sock, jid, `❌ Backup échoué : ${e.message}`, msg);
    }
  }
};
