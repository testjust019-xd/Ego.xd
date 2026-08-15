const { replyText, replyImage } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { getTargetJid } = require('../../lib/groupHelpers');
const { buildCard } = require('../../lib/profileCard');

module.exports = {
  name: 'card',
  aliases: ['profilecard', 'mycard', 'carte'],
  category: 'general',
  description: 'Carte de profil partageable — .card [@user]',
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const target = getTargetJid(msg) || sender;

    await replyText(sock, jid, '🃏 Génération de la System Card…', msg);

    try {
      const { text, png, profile } = await buildCard(target);
      if (png) {
        await replyImage(sock, jid, png, text, msg);
      } else {
        await replyText(sock, jid, text + '\n\n_Image PNG indisponible — carte texte._', msg);
      }
      // hint hub
      if (target === sender) {
        await replyText(
          sock,
          jid,
          `Hub : /hub (login) pour revoir ta card\nSVG : /api/hub/card.svg (connecté)`,
          msg
        ).catch(() => {});
      }
    } catch (e) {
      console.error('[card]', e);
      return replyText(sock, jid, `Erreur card : ${e.message}`, msg);
    }
  }
};
