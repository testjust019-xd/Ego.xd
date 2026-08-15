const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { isActivated, activate, getActivationMessage } = require('../../lib/activation');
const config = require('../../config');

module.exports = {
  name: 'activate',
  aliases: ['activer', 'unlock', 'verify'],
  category: 'general',
  description: 'Active le bot (1 seule fois) après avoir suivi une chaîne YouTube — .activate',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);

    if (isActivated(sender)) {
      return replyText(
        sock,
        jid,
        `✅ Ton compte est *déjà activé* (activation unique).\n` +
        `Tu peux utiliser les commandes selon ton rang.\n\n` +
        `Tape *${config.prefix}menu* pour commencer.`,
        msg
      );
    }

    activate(sender);
    return replyText(
      sock,
      jid,
      `✅ *Activation réussie !*\n\n` +
      `Merci d'avoir suivi la chaîne 🙏\n` +
      `Tu es maintenant un chasseur officiel.\n` +
      `Cette activation est *permanente* (plus besoin de la refaire).\n\n` +
      `📌 Prochaines étapes :\n` +
      `• *${config.prefix}profile* — voir ton rang\n` +
      `• *${config.prefix}arise* — activer le System\n` +
      `• *${config.prefix}menu* — toutes les commandes\n\n` +
      `_Monte en rang (E → Monarch) pour débloquer plus de pouvoirs et augmenter tes limites journalières._`,
      msg
    );
  }
};
