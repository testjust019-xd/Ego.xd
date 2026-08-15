const { replyText } = require('../../helpers/reply');

function waveFee(amount, type) {
  // approx Wave CI
  if (type === 'depot') return 0;
  // retrait
  if (amount <= 5000) return 100;
  if (amount <= 20000) return 200;
  if (amount <= 50000) return 400;
  return Math.min(1000, Math.round(amount * 0.01));
}
function omFee(amount, type) {
  if (type === 'depot') return Math.round(amount * 0.01);
  return Math.round(amount * 0.01);
}
function mtnFee(amount, type) {
  if (type === 'depot') return 0;
  return Math.max(50, Math.round(amount * 0.01));
}

module.exports = {
  name: 'momo',
  category: 'ci',
  description: 'Frais Mobile Money — .momo <montant> [retrait|depot]',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const amount = parseInt(args[0], 10);
    const type = (args[1] || 'retrait').toLowerCase().startsWith('dep') ? 'depot' : 'retrait';
    if (!amount || amount < 100) return replyText(sock, jid, 'Ex: `.momo 10000 retrait`', msg);

    const w = waveFee(amount, type);
    const o = omFee(amount, type);
    const m = mtnFee(amount, type);
    return replyText(sock, jid,
      `📱 *Frais Mobile Money (~${type})*\nMontant : *${amount.toLocaleString('fr-FR')}* F\n\n` +
      `· Wave ≈ ${w} F → reçu ~${amount - (type === 'retrait' ? w : 0)} F\n` +
      `· Orange Money ≈ ${o} F\n` +
      `· MTN MoMo ≈ ${m} F\n\n` +
      `_Estimations — vérifie l\'app officielle._`,
      msg
    );
  }
};
