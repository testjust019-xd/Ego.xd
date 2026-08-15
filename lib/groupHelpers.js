const config = require('../config');
const { isOwnerMessage, getSenderJid, digitsOnly } = require('./senderUtils');

/** Owner du bot (LID + numéro + fromMe) */
function isOwner(msg, sock) {
  return isOwnerMessage(msg, sock);
}

/** Admin groupe ou owner bot */
async function isSenderAdmin(sock, jid, msg) {
  if (isOwnerMessage(msg, sock)) return true;
  try {
    const groupMeta = await sock.groupMetadata(jid);
    const senderJid = getSenderJid(sock, msg);
    const senderDigits = digitsOnly(senderJid);
    return groupMeta.participants.some((p) => {
      const idDigits = digitsOnly(p.id);
      const lidDigits = digitsOnly(p.lid);
      const match =
        p.id === senderJid ||
        (senderDigits && (idDigits === senderDigits || lidDigits === senderDigits));
      return match && (p.admin === 'admin' || p.admin === 'superadmin');
    });
  } catch (_) {
    return false;
  }
}

function getTargetJid(msg) {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  return contextInfo?.participant || contextInfo?.mentionedJid?.[0] || null;
}

module.exports = { isOwner, isSenderAdmin, getTargetJid };
