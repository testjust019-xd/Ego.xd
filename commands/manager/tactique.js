const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const managerDB = require('../../lib/managerDB');
const engine = require('../../lib/managerEngine');

module.exports = {
  name: "tactique",
  category: "manager",
  description: "Change ta formation — .tactique <formation> (ex: .tactique 4-3-3)",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const club = managerDB.getClub(senderJid);

    if (!club) {
      return replyText(sock, jid, "Tu n'as pas encore de club. Tape .club <nom> pour en créer un.", msg);
    }

    const choice = args[0];

    if (!choice) {
      let text = `🎯 Formation actuelle : *${engine.FORMATIONS[club.formation]?.label || club.formation}*\n\n*Formations disponibles :*\n`;
      for (const key in engine.FORMATIONS) {
        text += `• ${key} — ${engine.FORMATIONS[key].label}\n`;
      }
      text += `\nChange avec : .tactique <formation>`;
      return replyText(sock, jid, text, msg);
    }

    if (!engine.FORMATIONS[choice]) {
      return replyText(sock, jid, `Formation inconnue. Choix possibles : ${Object.keys(engine.FORMATIONS).join(', ')}`, msg);
    }

    managerDB.updateClub(senderJid, { formation: choice });
    return replyText(sock, jid, `✅ Nouvelle tactique : *${engine.FORMATIONS[choice].label}*`, msg);
  }
};
