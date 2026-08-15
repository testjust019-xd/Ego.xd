const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: "marche",
  category: "manager",
  description: "Affiche le marché des transferts — .marche",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    let market = engine.refreshMarketIfNeeded(managerDB.getMarket());
    managerDB.setMarket(market);

    const nextRefresh = market.generatedAt + engine.MARKET_REFRESH_MS;
    const minutesLeft = Math.max(0, Math.ceil((nextRefresh - Date.now()) / 60000));

    let text = `🛒 *Marché des transferts*\n(renouvelé dans ${minutesLeft} min)\n\n`;
    market.players.forEach((p, i) => {
      text += `${i + 1}. *${p.name}* — ${p.pos} • ${p.rating} OVR (pot. ${p.potential}) • ${p.age} ans\n💰 ${p.price.toLocaleString('fr-FR')} €\n\n`;
    });
    text += `Recrute avec .recruter <numéro>. Ton budget : ${club.budget.toLocaleString('fr-FR')} €`;

    return replyText(sock, jid, text, msg);
  }
};
