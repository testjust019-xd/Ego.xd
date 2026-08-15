/**
 * .afk [raison] — mode absent
 * .afk off / .back — revenir
 */
const config = require('../../config');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { setAfk, clearAfk, getAfk, formatDuration } = require('../../lib/afkDB');

module.exports = {
  name: 'afk',
  aliases: ['back'],
  category: 'general',
  description: 'Mode absent — .afk [raison] | .afk off | .back',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const sub = (args[0] || '').toLowerCase();
    const isBack = this.name === 'back' || sub === 'off' || sub === 'back' || sub === 'retour';

    if (isBack) {
      const was = clearAfk(sender);
      if (!was) {
        return replyText(sock, jid, 'Tu n\'étais pas en AFK.', msg);
      }
      const dur = formatDuration(Date.now() - was.since);
      return replyText(
        sock,
        jid,
        `✅ Tu es de retour !\n⏱ AFK pendant *${dur}*` +
          (was.reason ? `\n📝 Raison : _${was.reason}_` : ''),
        msg
      );
    }

    const reason = args.join(' ').trim() || 'Absent';
    setAfk(sender, reason);
    return replyText(
      sock,
      jid,
      `💤 *AFK activé*\n📝 ${reason}\n\n` +
        `_Quand on te mentionne, le bot préviendra. Tape \`${config.prefix}afk off\` ou \`${config.prefix}back\` pour revenir._`,
      msg
    );
  }
};
