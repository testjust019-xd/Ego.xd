const { replyText } = require('../../helpers/reply');
const { isSenderAdmin, getTargetJid } = require('../../lib/groupHelpers');
const { removeWarning, getWarnCount } = require('../../lib/warnings');

module.exports = {
  name: 'unwarn',
  category: 'moderation',
  description: "Retire un avertissement — réponds au message avec .unwarn",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    if (!jid.endsWith('@g.us')) {
      return replyText(sock, jid, 'Cette commande ne marche que dans un groupe.', msg);
    }

    if (!(await isSenderAdmin(sock, jid, msg))) {
      return replyText(sock, jid, 'Seuls les admins peuvent utiliser .unwarn', msg);
    }

    const target = getTargetJid(msg);
    if (!target) {
      return replyText(sock, jid, 'Réponds au message de la personne avec .unwarn', msg);
    }

    const before = getWarnCount(jid, target);
    if (before === 0) {
      return replyText(sock, jid, 'Cette personne n\'a aucun avertissement.', msg);
    }

    const after = removeWarning(jid, target);
    return replyText(sock, jid, `✅ Avertissement retiré. Reste : *${after}*.`, msg);
  }
};
