const { replyText } = require('../../helpers/reply');
const managerDB = require('../../lib/managerDB');

module.exports = {
  name: "classement",
  category: "manager",
  description: "Classement des clubs par points — .classement",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const clubs = managerDB.getAllClubs();

    if (!clubs.length) {
      return replyText(sock, jid, "Aucun club n'a encore été créé. Tape .club <nom> pour être le premier !", msg);
    }

    const sorted = clubs.sort((a, b) => {
      if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
      const diffA = a.stats.gf - a.stats.ga;
      const diffB = b.stats.gf - b.stats.ga;
      return diffB - diffA;
    }).slice(0, 15);

    let text = `🏆 *Classement des clubs*\n\n`;
    sorted.forEach((c, i) => {
      const diff = c.stats.gf - c.stats.ga;
      text += `${i + 1}. *${c.name}* — ${c.stats.points} pts (${c.stats.wins}V ${c.stats.draws}N ${c.stats.losses}D, diff ${diff >= 0 ? '+' : ''}${diff})\n`;
    });

    return replyText(sock, jid, text, msg);
  }
};
