const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { parseDuration, addReminder } = require('../../lib/reminders');

module.exports = {
  name: 'timer',
  category: 'tools',
  description: 'Compte à rebours — .timer <durée> [label]',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    if (!args[0]) return replyText(sock, jid, 'Ex: `.timer 5m Pizza` ou `.timer 30s`', msg);
    const ms = parseDuration(args[0]);
    if (!ms || ms < 5000 || ms > 24 * 3600000) {
      return replyText(sock, jid, 'Durée : 5s – 24h (s/m/h)', msg);
    }
    const label = args.slice(1).join(' ') || 'Timer terminé !';
    addReminder(jid, sender, `⏱ ${label}`, ms);
    return replyText(sock, jid, `⏱ Timer lancé : *${args[0]}*\n${label}`, msg);
  }
};
