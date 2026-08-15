const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { parseDuration, addReminder } = require('../../lib/reminders');

module.exports = {
  name: 'remind',
  category: 'tools',
  description: 'Rappel dans le chat — .remind <temps> <message>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    if (args.length < 2) {
      return replyText(sock, jid, 'Ex: `.remind 30m Appelle maman` ou `.remind 2h Réunion`', msg);
    }
    const ms = parseDuration(args[0]);
    if (!ms || ms < 10000 || ms > 7 * 86400000) {
      return replyText(sock, jid, 'Durée invalide (10s – 7 jours). Unités : s, m, h, d', msg);
    }
    const message = args.slice(1).join(' ');
    const item = addReminder(jid, sender, message, ms);
    const mins = Math.round(ms / 60000);
    return replyText(sock, jid, `⏰ Rappel enregistré (id ${item.id}) dans ~${mins} min.\n💬 ${message}`, msg);
  }
};
