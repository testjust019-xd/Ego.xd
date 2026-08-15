const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const { getGroupSettings, setGroupSetting } = require('../../lib/groupSettings');

module.exports = {
  name: 'goodbye',
  category: 'moderation',
  description: 'Goodbye on/off + texte — .goodbye on|off|set <texte>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, 'Commande réservée aux groupes.', msg);
    }
    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, 'Admins uniquement.', msg);
    }

    const sub = (args[0] || '').toLowerCase();
    const current = getGroupSettings(jid);

    if (!sub || sub === 'status') {
      return replyText(sock, jid,
        `👋 *Goodbye* : ${current.goodbye ? 'ON ✅' : 'OFF ❌'}\n\n` +
        `Texte :\n${current.goodbyeText}\n\n` +
        `• \`.goodbye on\` / \`.goodbye off\`\n` +
        `• \`.goodbye set @user a quitté {group}\`\n\n` +
        `_PP du membre, sinon assets/media/goodbye.(png|mp4|…)_`,
        msg
      );
    }

    if (sub === 'on' || sub === 'off') {
      setGroupSetting(jid, 'goodbye', sub === 'on');
      return replyText(sock, jid, `✅ Goodbye ${sub === 'on' ? 'activé' : 'désactivé'}.`, msg);
    }

    if (sub === 'set') {
      const text = args.slice(1).join(' ').trim();
      if (!text) {
        return replyText(sock, jid, 'Ex: `.goodbye set @user nous a quittés…`', msg);
      }
      setGroupSetting(jid, 'goodbyeText', text);
      return replyText(sock, jid, `✅ Message goodbye enregistré :\n${text}`, msg);
    }

    return replyText(sock, jid, 'Usage : `.goodbye on|off|set <texte>|status`', msg);
  }
};
