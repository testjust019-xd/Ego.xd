const { replyText } = require('../../helpers/reply');
const { isSenderAdmin } = require('../../lib/groupHelpers');
const { getGroupSettings, setGroupSetting } = require('../../lib/groupSettings');

module.exports = {
  name: 'antidelete',
  category: 'moderation',
  description: 'Restaure les messages supprimés (texte + médias) — .antidelete on/off',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, 'Commande réservée aux groupes.', msg);
    }
    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, 'Admins uniquement.', msg);
    }

    const choice = (args[0] || '').toLowerCase();
    const current = getGroupSettings(jid);

    if (choice !== 'on' && choice !== 'off') {
      return replyText(sock, jid,
        `🛡️ *Antidelete* : ${current.antidelete ? 'ON ✅' : 'OFF ❌'}\n\n` +
        `Quand c'est ON, le bot republie les messages supprimés :\n` +
        `texte, images, vidéos, audio, stickers, documents.\n\n` +
        `Usage : \`.antidelete on\` · \`.antidelete off\`\n` +
        `_Cache ~45 min / 120 messages par groupe._`,
        msg
      );
    }

    setGroupSetting(jid, 'antidelete', choice === 'on');
    return replyText(sock, jid, `✅ Antidelete ${choice === 'on' ? 'activé' : 'désactivé'}.`, msg);
  }
};
