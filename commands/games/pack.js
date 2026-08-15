const cartes = require('./cartes');

module.exports = {
  name: 'pack',
  category: 'games',
  description: 'Ouvre un pack de cartes — alias de .cartes pack',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args, commands) {
    return cartes.execute(sock, msg, ['pack', ...args], commands);
  }
};
