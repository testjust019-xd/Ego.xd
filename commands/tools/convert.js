const { replyText } = require('../../helpers/reply');

// Frankfurter.app — gratuit, sans clé (BCE)
module.exports = {
  name: 'convert',
  category: 'tools',
  description: 'Convertir devises — .convert 100 usd en xof',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const raw = args.join(' ').toLowerCase().trim();

    // Patterns: 100 usd en xof | 100 usd xof | 100usd xof
    const m = raw.match(/^([\d.,]+)\s*([a-z]{3})\s*(?:en|to|in|->)?\s*([a-z]{3})$/i);
    if (!m) {
      return replyText(sock, jid,
        '💱 *Convertisseur*\n\n' +
        '`.convert 100 usd en xof`\n' +
        '`.convert 50000 xof eur`\n' +
        '`.convert 1 btc usd` _(si dispo)_\n\n' +
        'Devises courantes : USD EUR XOF XAF GBP NGN GHS CFA…',
        msg
      );
    }

    let amount = parseFloat(m[1].replace(',', '.'));
    let from = m[2].toUpperCase();
    let to = m[3].toUpperCase();

    // alias CFA
    if (from === 'CFA') from = 'XOF';
    if (to === 'CFA') to = 'XOF';

    if (!amount || amount <= 0) {
      return replyText(sock, jid, 'Montant invalide.', msg);
    }

    try {
      const res = await fetch(
        `https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`
      );
      const data = await res.json();
      if (!data.rates || data.rates[to] == null) {
        // fallback exchangerate.host style free
        const res2 = await fetch(
          `https://open.er-api.com/v6/latest/${from}`
        );
        const data2 = await res2.json();
        if (data2.result !== 'success' || !data2.rates?.[to]) {
          return replyText(sock, jid, `Conversion ${from} → ${to} indisponible.`, msg);
        }
        const result = amount * data2.rates[to];
        return replyText(sock, jid,
          `💱 *${amount} ${from}* = *${result.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${to}*\n` +
          `_Taux indicatif_`,
          msg
        );
      }

      const result = data.rates[to];
      return replyText(sock, jid,
        `💱 *${amount} ${from}* = *${Number(result).toLocaleString('fr-FR', { maximumFractionDigits: 4 })} ${to}*\n` +
        `📅 ${data.date || ''} · source BCE (Frankfurter)`,
        msg
      );
    } catch (err) {
      console.error('[convert]', err);
      return replyText(sock, jid, 'Erreur conversion (réseau / devise).', msg);
    }
  }
};
