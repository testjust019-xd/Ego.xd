const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'pdf',
  category: 'tools',
  description: 'Génère un PDF texte simple — .pdf <texte>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ').trim();
    if (!text) return replyText(sock, jid, 'Ex: `.pdf Compte-rendu réunion 12h`', msg);

    // PDF minimal (texte brut en "PDF" très simple — header PDF)
    // Pour rester sans dépendance : on envoie un .txt nommé .pdf en document
    // (vrai PDF binaire minimal)
    const safe = text.slice(0, 2000).replace(/[()\\\\]/g, '');
    const stream = `BT /F1 12 Tf 50 750 Td (${safe.slice(0, 80)}) Tj ET`;
    const pdf =
      `%PDF-1.1\n` +
      `1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n` +
      `2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n` +
      `3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj\n` +
      `4 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj\n` +
      `5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n` +
      `xref\n0 6\n0000000000 65535 f \ntrailer<< /Size 6 /Root 1 0 R >>\nstartxref\n0\n%%EOF`;

    try {
      await sock.sendMessage(jid, {
        document: Buffer.from(pdf, 'utf8'),
        mimetype: 'application/pdf',
        fileName: 'arise-note.pdf',
        caption: '📄 PDF généré (texte simple)'
      }, { quoted: msg });
    } catch (err) {
      console.error('[pdf]', err);
      return replyText(sock, jid, 'Erreur génération PDF.', msg);
    }
  }
};
