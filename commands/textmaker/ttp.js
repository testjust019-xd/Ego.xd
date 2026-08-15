/**
 * .ttp <texte> — Text To Picture (image stylée)
 * Utilise une API publique de génération d'image texte.
 */
const { replyText, replyImage } = require('../../helpers/reply');

module.exports = {
  name: 'ttp',
  aliases: ['textpic', 'text2pic'],
  category: 'textmaker',
  description: 'Texte en image stylée — .ttp <texte>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ').trim();

    if (!text) {
      return replyText(sock, jid, 'Usage : `.ttp <texte>`\nExemple : `.ttp EGO.XD`', msg);
    }
    if (text.length > 80) {
      return replyText(sock, jid, '❌ Texte trop long (max 80 caractères).', msg);
    }

    try {
      // placehold.co génère une image simple avec le texte (gratuit, fiable)
      const encoded = encodeURIComponent(text.slice(0, 60));
      const url =
        `https://placehold.co/512x512/1a1a2e/e94560/png?text=${encoded}&font=montserrat`;

      await replyImage(sock, jid, url, `✨ ${text}`, msg);
    } catch (err) {
      console.error('[ttp]', err.message);
      // Fallback pure texte
      return replyText(
        sock,
        jid,
        `╔════════════════╗\n` +
          `║  *${text}*\n` +
          `╚════════════════╝\n\n` +
          `_(image indisponible — version texte)_`,
        msg
      );
    }
  }
};
