const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const { getGroupSettings, setGroupSetting } = require('../../lib/groupSettings');

module.exports = {
  name: 'welcome',
  category: 'moderation',
  description: 'Welcome on/off + texte — .welcome on|off|set <texte>',

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
        `👋 *Welcome* : ${current.welcome ? 'ON ✅' : 'OFF ❌'}\n\n` +
        `Texte :\n${current.welcomeText}\n\n` +
        `• \`.welcome on\` / \`.welcome off\`\n` +
        `• \`.welcome set Bienvenue @user dans {group} ({count})\`\n\n` +
        `_Placeholders : @user · {group} · {count}_\n` +
        `_PP du membre, sinon assets/media/welcome.(png|mp4|…)_`,
        msg
      );
    }

    if (sub === 'on' || sub === 'off') {
      setGroupSetting(jid, 'welcome', sub === 'on');
      return replyText(sock, jid, `✅ Welcome ${sub === 'on' ? 'activé' : 'désactivé'}.`, msg);
    }

    if (sub === 'set') {
      const text = args.slice(1).join(' ').trim();
      if (!text) {
        return replyText(sock, jid, 'Ex: `.welcome set Salut @user, bienvenue dans {group} !`', msg);
      }
      setGroupSetting(jid, 'welcomeText', text);
      return replyText(sock, jid, `✅ Message welcome enregistré :\n${text}`, msg);
    }

    return replyText(sock, jid, 'Usage : `.welcome on|off|set <texte>|status`', msg);
  }
};
