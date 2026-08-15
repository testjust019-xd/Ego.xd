const { downloadContentFromMessage } = require('baron-baileys-v2');
const { extractContent } = require('../../lib/msgContent');
const { replyText } = require('../../helpers/reply');
const { isOwnerMessage, isStaffMessage } = require('../../lib/senderUtils');

module.exports = {
  name: 'tostatus',
  category: 'general',
  aliases: ['poststatus'],
  description: "Poster un message (texte/image/vidéo) en statut WhatsApp — réponds au message avec .tostatus [légende]",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    // Poste le statut de TOUT le monde => réservé owner/staff pour éviter les abus
    if (!isOwnerMessage(msg, sock) && !isStaffMessage(msg, sock)) {
      return replyText(sock, jid, "⛔ Réservé au propriétaire/staff du bot (ça publie sur SON statut WhatsApp).", msg);
    }

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;
    const extraCaption = args.join(' ');

    try {
      if (quotedMsg) {
        const content = extractContent({ message: quotedMsg });
        if (!content) {
          return replyText(sock, jid, "Message non pris en charge pour un statut.", msg);
        }

        if (content.type === 'text') {
          await sock.sendMessage('status@broadcast', { text: extraCaption || content.text });
          return replyText(sock, jid, '✅ Statut texte publié.', msg);
        }

        if (content.type === 'image' || content.type === 'video') {
          const stream = await downloadContentFromMessage(content.mediaMsg, content.type);
          let buffer = Buffer.from([]);
          for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);
          await sock.sendMessage('status@broadcast', {
            [content.type]: buffer,
            caption: extraCaption || content.text || ''
          });
          return replyText(sock, jid, `✅ Statut ${content.type === 'image' ? 'image' : 'vidéo'} publié.`, msg);
        }

        return replyText(sock, jid, "Type de message non pris en charge pour un statut (image/vidéo/texte seulement).", msg);
      }

      // Pas de citation : poste juste le texte fourni en argument
      if (extraCaption) {
        await sock.sendMessage('status@broadcast', { text: extraCaption });
        return replyText(sock, jid, '✅ Statut texte publié.', msg);
      }

      return replyText(sock, jid, "Réponds à un message (texte/image/vidéo) avec .tostatus [légende], ou fais .tostatus <texte>.", msg);
    } catch (err) {
      console.error('[tostatus] erreur:', err.message);
      return replyText(sock, jid, "Erreur en publiant le statut.", msg);
    }
  }
};
