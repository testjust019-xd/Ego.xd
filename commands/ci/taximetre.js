const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'taximetre',
  category: 'ci',
  description: 'Estimation course taxi/Yango Abidjan — .taximetre <km>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const km = parseFloat(args[0]);
    if (!km || km <= 0) return replyText(sock, jid, 'Ex: `.taximetre 8` (distance en km)', msg);
    // approx Abidjan 2024-2026 style
    const base = 500;
    const perKmTaxi = 300;
    const perKmYango = 250;
    const taxi = Math.round(base + km * perKmTaxi);
    const yango = Math.round(800 + km * perKmYango);
    const woro = Math.round(200 + km * 150);
    return replyText(sock, jid,
      `🚕 *Estimation Abidjan (~${km} km)*\n\n` +
      `· Taxi compteur ≈ *${taxi.toLocaleString('fr-FR')}* F\n` +
      `· Yango / drive ≈ *${yango.toLocaleString('fr-FR')}* F\n` +
      `· Woro-woro (partagé) ≈ *${woro.toLocaleString('fr-FR')}* F\n\n` +
      `_Indicatif — embouteillages & nuit majorent._`,
      msg
    );
  }
};
