const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'currency',
  category: 'tools',
  description: 'Taux FCFA (XOF) rapides — .currency',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      // Frankfurter (BCE) + open.er-api fallback
      let rates = null;
      try {
        const r = await fetch('https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,XOF').then(x => x.json());
        rates = r.rates;
      } catch {}
      if (!rates) {
        const r = await fetch('https://open.er-api.com/v6/latest/EUR').then(x => x.json());
        rates = r.rates;
      }
      const xof = rates.XOF || 655.957;
      const usd = rates.USD;
      const gbp = rates.GBP;
      // XOF per 1 USD approx
      const xofPerUsd = (xof / usd).toFixed(2);
      let text = `💱 *Taux rapides (base EUR)*\n\n`;
      text += `1 EUR ≈ *${xof.toFixed(2)}* XOF\n`;
      if (usd) text += `1 EUR ≈ ${usd.toFixed(4)} USD\n`;
      text += `1 USD ≈ *${xofPerUsd}* XOF (approx)\n`;
      text += `\n_Pour convertir : \`.convert 100 usd en xof\`_`;
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[currency]', err);
      return replyText(sock, jid, 'Erreur taux de change.', msg);
    }
  }
};
