// Stocke les parties actives par groupe (en mémoire, se réinitialise au redémarrage)
const activeGames = new Map(); // jid -> { spyJid, location, players: [jid...] }

const LOCATIONS = [
  "Un stade de football", "Un aéroport", "Un hôpital", "Une école",
  "Un marché", "Une plage", "Un restaurant", "Un cinéma",
  "Un commissariat", "Un studio de tournage"
];

module.exports = { activeGames, LOCATIONS };
