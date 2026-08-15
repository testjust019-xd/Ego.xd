const { downloadContentFromMessage } = require('baron-baileys-v2');
const config = require('../../config');
const { replyText } = require('../../helpers/reply');

function isOwner(msg) {
  if (msg.key?.fromMe) return true;
  const candidates = [
    msg.key?.participantPn, msg.key?.participantAlt, msg.key?.participant,
    msg.key?.remoteJidAlt, msg.key?.remoteJid
  ];
  for (const c of candidates) {
    const d = String(c || '').split(':')[0].replace(/@.*$/, '').replace(/[^0-9]/g, '');
    if (d && (config.ownerNumbers || []).includes(d)) return true;
  }
  return false;
}

module.exports = {
  name: 'setpp',
  aliases: ['setprofile', 'botpp'],
  category: 'general',
  description: 'Change la photo de profil du bot — owner — réponds à une image + .setpp',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    if (!isOwner(msg)) {
      return replyText(sock, jid, '🔒 Owner only.', msg);
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const target = quoted || msg.message;
    const imageNode = target?.imageMessage;
    if (!imageNode) {
      return replyText(sock, jid, 'Réponds à une *image* avec `.setpp`.', msg);
    }

    try {
      const stream = await downloadContentFromMessage(imageNode, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      // JID du bot
      const botJid = sock.user?.id
        ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
        : null;
      if (!botJid) {
        return replyText(sock, jid, '❌ Impossible de résoudre le JID du bot.', msg);
      }

      await sock.updateProfilePicture(botJid, buffer);
      return replyText(sock, jid, '✅ Photo de profil du bot mise à jour.', msg);
    } catch (err) {
      console.error('[setpp]', err);
      return replyText(sock, jid, `❌ Échec setpp : ${err.message}`, msg);
    }
  }
};
