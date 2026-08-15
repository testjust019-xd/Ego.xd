const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'qrscan',
  category: 'tools',
  aliases: ['scanqr', 'lireqr'],
  description: 'Lire/décoder un QR code — réponds à une image (ou envoie-en une avec la commande en légende) avec .qrscan',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;

    const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
    const quotedMsg = contextInfo?.quotedMessage;
    const imageMsg = quotedMsg?.imageMessage || msg.message?.imageMessage;

    if (!imageMsg) {
      return replyText(sock, jid,
        "Réponds à une image contenant un QR code avec .qrscan (ou envoie l'image avec .qrscan en légende).",
        msg
      );
    }

    try {
      // Téléchargement du buffer image (message direct ou cité)
      const dl = await sock.downloadMediaMessage({
        key: quotedMsg
          ? {
              remoteJid: jid,
              id: contextInfo.stanzaId,
              participant: contextInfo.participant
            }
          : msg.key,
        message: quotedMsg || msg.message
      });

      let buffer;
      if (Buffer.isBuffer(dl)) {
        buffer = dl;
      } else if (dl && typeof dl[Symbol.asyncIterator] === 'function') {
        const chunks = [];
        for await (const c of dl) chunks.push(c);
        buffer = Buffer.concat(chunks);
      } else {
        throw new Error('Format de média inattendu.');
      }

      const { Jimp } = require('jimp');
      const jsQR = require('jsqr');

      const image = await Jimp.read(buffer);
      const { data, width, height } = image.bitmap; // RGBA brut

      const result = jsQR(new Uint8ClampedArray(data.buffer, data.byteOffset, data.length), width, height);

      if (!result || !result.data) {
        return replyText(sock, jid, "❌ Aucun QR code détecté dans cette image (essaie une image plus nette/droite).", msg);
      }

      const content = result.data;
      const isUrl = /^https?:\/\//i.test(content);

      return replyText(
        sock, jid,
        `📷 *QR décodé*\n\n${content}\n\n${isUrl ? '_C\'est un lien — clique pour l\'ouvrir._' : ''}`,
        msg
      );
    } catch (err) {
      console.error('[qrscan] erreur:', err.message);
      return replyText(sock, jid, "Erreur en lisant le QR code (image invalide ou trop compressée).", msg);
    }
  }
};
