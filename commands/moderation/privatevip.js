const { replyText } = require('../../helpers/reply');
const { isOwner } = require('../../lib/groupHelpers');
const {
  getPrivateVip,
  addPrivateVip,
  removePrivateVip,
  isPrivateOn
} = require('../../lib/privateMode');

function normalizeArgNumber(arg) {
  if (!arg) return '';
  return String(arg).replace(/[^0-9]/g, '');
}

module.exports = {
  name: 'privatevip',
  category: 'moderation',
  description: 'Gère les numéros VIP du mode privé — .privatevip add|del|list <numéro>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, '⛔ Réservé au owner.', msg);
    }

    const sub = (args[0] || '').toLowerCase();
    const numArg = args[1] || args[0];

    if (!sub || sub === 'list' || sub === 'ls' || sub === 'voir') {
      const list = getPrivateVip();
      const mode = isPrivateOn() ? 'ON 🔒' : 'OFF 🔓';
      if (!list.length) {
        return replyText(
          sock,
          jid,
          `📋 *VIP mode privé* (mode: ${mode})\nAucun numéro VIP.\n\nAjoute avec :\n\`.privatevip add 225XXXXXXXX\``,
          msg
        );
      }
      const lines = list.map((n, i) => `${i + 1}. \`+${n}\``).join('\n');
      return replyText(
        sock,
        jid,
        `📋 *VIP mode privé* (mode: ${mode})\n\n${lines}\n\n• \`.privatevip add <num>\`\n• \`.privatevip del <num>\``,
        msg
      );
    }

    if (sub === 'add' || sub === 'ajouter' || sub === '+') {
      const num = normalizeArgNumber(args[1]);
      if (!num) {
        return replyText(sock, jid, 'Utilisation : `.privatevip add 2250508549577` (sans le +)', msg);
      }
      const res = addPrivateVip(num);
      if (!res.ok) {
        return replyText(sock, jid, `⚠️ Impossible d'ajouter : ${res.reason}`, msg);
      }
      return replyText(
        sock,
        jid,
        `✅ VIP ajouté : \`+${num}\`\nCe numéro pourra utiliser le bot même si \`.private on\`.\nTotal VIP : ${res.list.length}`,
        msg
      );
    }

    if (sub === 'del' || sub === 'remove' || sub === 'rm' || sub === 'delete' || sub === '-') {
      const num = normalizeArgNumber(args[1]);
      if (!num) {
        return replyText(sock, jid, 'Utilisation : `.privatevip del 2250508549577`', msg);
      }
      const res = removePrivateVip(num);
      if (!res.ok) {
        return replyText(sock, jid, `⚠️ Numéro non trouvé dans la liste VIP.`, msg);
      }
      return replyText(
        sock,
        jid,
        `🗑️ VIP retiré : \`+${num}\`\nTotal VIP restants : ${res.list.length}`,
        msg
      );
    }

    // Raccourci : .privatevip 225xxx → add
    const maybeNum = normalizeArgNumber(sub);
    if (maybeNum.length >= 8 && !args[1]) {
      const res = addPrivateVip(maybeNum);
      if (!res.ok) {
        return replyText(sock, jid, `⚠️ ${res.reason}`, msg);
      }
      return replyText(sock, jid, `✅ VIP ajouté : \`+${maybeNum}\` (total ${res.list.length})`, msg);
    }

    return replyText(
      sock,
      jid,
      'Utilisation :\n• `.privatevip list`\n• `.privatevip add <numéro>`\n• `.privatevip del <numéro>`\n\nLe numéro doit être au format international *sans* le + (ex: 2250508549577).',
      msg
    );
  }
};
