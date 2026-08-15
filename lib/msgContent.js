/**
 * Extrait type + texte + infos media d'un message Baileys (sans télécharger le buffer).
 */

function extractContent(msg) {
  const m = msg.message;
  if (!m) return null;

  // unwrap ephemeral / viewOnce
  const inner =
    m.ephemeralMessage?.message ||
    m.viewOnceMessage?.message ||
    m.viewOnceMessageV2?.message ||
    m.viewOnceMessageV2Extension?.message ||
    m.documentWithCaptionMessage?.message ||
    m;

  if (inner.conversation) {
    return { type: 'text', text: inner.conversation };
  }
  if (inner.extendedTextMessage?.text) {
    return {
      type: 'text',
      text: inner.extendedTextMessage.text,
      mentions: inner.extendedTextMessage.contextInfo?.mentionedJid || []
    };
  }
  if (inner.imageMessage) {
    return {
      type: 'image',
      text: inner.imageMessage.caption || '',
      mimetype: inner.imageMessage.mimetype || 'image/jpeg',
      mediaMsg: inner.imageMessage
    };
  }
  if (inner.videoMessage) {
    return {
      type: 'video',
      text: inner.videoMessage.caption || '',
      mimetype: inner.videoMessage.mimetype || 'video/mp4',
      mediaMsg: inner.videoMessage,
      gif: !!inner.videoMessage.gifPlayback
    };
  }
  if (inner.audioMessage) {
    return {
      type: 'audio',
      text: '',
      mimetype: inner.audioMessage.mimetype || 'audio/ogg; codecs=opus',
      mediaMsg: inner.audioMessage,
      ptt: !!inner.audioMessage.ptt
    };
  }
  if (inner.stickerMessage) {
    return {
      type: 'sticker',
      text: '',
      mimetype: inner.stickerMessage.mimetype || 'image/webp',
      mediaMsg: inner.stickerMessage
    };
  }
  if (inner.documentMessage) {
    return {
      type: 'document',
      text: inner.documentMessage.caption || '',
      mimetype: inner.documentMessage.mimetype || 'application/octet-stream',
      fileName: inner.documentMessage.fileName || 'file',
      mediaMsg: inner.documentMessage
    };
  }
  return null;
}

function isRevoke(msg) {
  const p = msg.message?.protocolMessage;
  // Baileys: ProtocolMessage.REVOKE = 0
  return p && (p.type === 0 || p.type === 'REVOKE');
}

function getRevokeKey(msg) {
  return msg.message?.protocolMessage?.key || null;
}

module.exports = { extractContent, isRevoke, getRevokeKey };
