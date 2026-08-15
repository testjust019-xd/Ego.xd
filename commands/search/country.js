const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "country",
  category: "search",
  description: "Infos sur un pays — .country <nom>",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = args.join(' ');

    if (!name) {
      return replyText(sock, jid, "Écris un pays, ex: .country Côte d'Ivoire", msg);
    }

    try {
      const res = await fetch(`https://restcountries.com/v3.1/name/${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error('non trouvé');
      const data = await res.json();
      const c = data[0];

      const text = `🌍 *${c.name.common}*\n` +
        `🏛 Capitale : ${c.capital?.[0] || "?"}\n` +
        `👥 Population : ${c.population.toLocaleString()}\n` +
        `🗣 Langue(s) : ${Object.values(c.languages || {}).join(', ')}\n` +
        `💰 Monnaie : ${Object.values(c.currencies || {}).map(cu => cu.name).join(', ')}\n` +
        `🌐 Région : ${c.region}`;

      return replyText(sock, jid, text, msg);
    } catch (err) {
      return replyText(sock, jid, "Pays introuvable.", msg);
    }
  }
};
