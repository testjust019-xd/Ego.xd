const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'cotes',
  category: 'foot',
  description: 'Cotes de paris (affichage indicatif) — .cotes <match>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const match = args.join(' ').trim();
    if (!match) return replyText(sock, jid, 'Ex: `.cotes PSG vs OM` — *affichage indicatif uniquement, pas de paris réels*.', msg);

    // Génération indicative basée sur hash du nom (pas de vrai bookmaker API gratuite fiable)
    function seed(s) {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      return h;
    }
    const h = seed(match.toLowerCase());
    const c1 = (1.4 + (h % 120) / 100).toFixed(2);
    const cn = (2.8 + ((h >> 3) % 150) / 100).toFixed(2);
    const c2 = (1.5 + ((h >> 7) % 180) / 100).toFixed(2);

    const text =
      `📊 *Cotes indicatives*\n` +
      `⚽ ${match}\n\n` +
      `1️⃣  Victoire 1  : *${c1}*\n` +
      `➖  Nul         : *${cn}*\n` +
      `2️⃣  Victoire 2  : *${c2}*\n\n` +
      `_⚠️ Affichage fictif / démo uniquement. Ne constitue pas un conseil de paris._`;
    return replyText(sock, jid, text, msg);
  }
};
