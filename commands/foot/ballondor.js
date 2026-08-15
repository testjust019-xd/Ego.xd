const { replyText } = require('../../helpers/reply');

const HISTORY = [
  { year: 2024, winner: 'Rodri', club: 'Man City' },
  { year: 2023, winner: 'Lionel Messi', club: 'Inter Miami' },
  { year: 2022, winner: 'Karim Benzema', club: 'Real Madrid' },
  { year: 2021, winner: 'Lionel Messi', club: 'PSG' },
  { year: 2019, winner: 'Lionel Messi', club: 'Barcelona' },
  { year: 2018, winner: 'Luka Modrić', club: 'Real Madrid' },
  { year: 2017, winner: 'Cristiano Ronaldo', club: 'Real Madrid' },
  { year: 2016, winner: 'Cristiano Ronaldo', club: 'Real Madrid' },
  { year: 2015, winner: 'Lionel Messi', club: 'Barcelona' },
  { year: 2014, winner: 'Cristiano Ronaldo', club: 'Real Madrid' },
];

module.exports = {
  name: 'ballondor',
  category: 'foot',
  description: 'Historique Ballon d\'Or — .ballondor',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    let text = `🏆 *Ballon d'Or — récents vainqueurs*\n\n`;
    for (const h of HISTORY) {
      text += `*${h.year}* — ${h.winner} (${h.club})\n`;
    }
    text += `\n_Source indicative. Pour 2025+ regarde France Football._`;
    return replyText(sock, jid, text, msg);
  }
};
