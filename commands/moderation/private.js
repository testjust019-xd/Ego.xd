const { replyText } = require('../../helpers/reply');
const { isOwner } = require('../../lib/groupHelpers');
const { isPrivateOn, setPrivateMode } = require('../../lib/privateMode');

module.exports = {
  name: 'private',
  category: 'moderation',
  description: 'Active/désactive le mode privé du bot — .private on|off|status',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, '⛔ Réservé au owner.', msg);
    }

    const sub = (args[0] || '').toLowerCase();

    if (!sub || sub === 'status' || sub === 'etat' || sub === 'état') {
      const on = isPrivateOn();
      return replyText(
        sock,
        jid,
        on
          ? '🔒 *Mode privé* : **ON**\nSeuls owner, staff et VIP (`.privatevip`) peuvent utiliser le bot.'
          : '🔓 *Mode privé* : **OFF**\nTout le monde peut utiliser le bot.',
        msg
      );
    }

    if (sub === 'on' || sub === '1' || sub === 'true' || sub === 'enable') {
      setPrivateMode(true);
      return replyText(
        sock,
        jid,
        '🔒 *Mode privé activé.*\nSeuls owner, staff et numéros VIP peuvent continuer à utiliser le bot.\nGère les VIP avec `.privatevip`.',
        msg
      );
    }

    if (sub === 'off' || sub === '0' || sub === 'false' || sub === 'disable') {
      setPrivateMode(false);
      return replyText(sock, jid, '🔓 *Mode privé désactivé.* Tout le monde peut à nouveau utiliser le bot.', msg);
    }

    return replyText(
      sock,
      jid,
      'Utilisation :\n• `.private on` — active\n• `.private off` — désactive\n• `.private status` — état actuel',
      msg
    );
  }
};
