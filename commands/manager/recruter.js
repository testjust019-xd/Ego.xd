const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: "recruter",
  category: "manager",
  description: "Recrute un joueur du marché — .recruter <numéro>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    const index = parseInt(args[0], 10) - 1;
    let market = engine.refreshMarketIfNeeded(managerDB.getMarket());
    managerDB.setMarket(market);

    if (isNaN(index) || index < 0 || index >= market.players.length) {
      return replyText(sock, jid, `Utilisation : .recruter <numéro>\nRegarde .marche pour voir les numéros disponibles (1-${market.players.length}).`, msg);
    }

    const player = market.players[index];

    if (club.budget < player.price) {
      return replyText(sock, jid, `💸 Budget insuffisant. Il te faut ${player.price.toLocaleString('fr-FR')} €, tu as ${club.budget.toLocaleString('fr-FR')} €.`, msg);
    }

    if (club.squad.some(p => p.id === player.id)) {
      return replyText(sock, jid, "Ce joueur vient déjà d'être recruté par quelqu'un d'autre.", msg);
    }

    market.players.splice(index, 1);
    market.players.push(engine.generatePlayer(engine.randInt(55, 80)));
    managerDB.setMarket(market);

    const newSquad = [...club.squad, player];
    managerDB.updateClub(senderJid, {
      budget: club.budget - player.price,
      squad: newSquad
    });

    return replyText(sock, jid,
      `✅ *${player.name}* rejoint ${club.name} !\n` +
      `${player.pos} • ${player.rating} OVR • ${player.age} ans\n` +
      `💰 -${player.price.toLocaleString('fr-FR')} € (reste ${(club.budget - player.price).toLocaleString('fr-FR')} €)`,
      msg
    );
  }
};
