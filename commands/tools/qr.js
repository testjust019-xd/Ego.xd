const QRCode = require('qrcode');
const { replyImage, replyText } = require('../../helpers/reply');

module.exports = {
  name: "qr",
  category: "tools",
  description: "Génère un QR code — .qr <texte ou lien>",

  dailyLimit: true,
  // Génère le QR code localement (lib "qrcode"), pas via une API en ligne —
  // plus fiable, marche même hors ligne une fois npm install fait.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const content = args.join(' ');

    if (!content) {
      return replyText(sock, jid, "Écris un texte ou lien, ex: .qr https://digit-shop.netlify.app", msg);
    }

    try {
      const buffer = await QRCode.toBuffer(content, { width: 400, margin: 2 });
      return replyImage(sock, jid, buffer, "📷 QR code généré", msg);
    } catch (err) {
      console.error('[qr] erreur:', err);
      return replyText(sock, jid, "Erreur en générant le QR code.", msg);
    }
  }
};
