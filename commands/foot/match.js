const { replyText } = require('../../helpers/reply');

const API_KEY = '3';

module.exports = {
  name: "match",
  category: "foot",
  description: "Prochains matchs d'une équipe — .match <equipe>",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const team = args.join(' ');

    if (!team) {
      return replyText(sock, jid, "Écris une équipe, ex: `.match Côte d'Ivoire`", msg);
    }

    try {
      const searchRes = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(team)}`);
      const searchData = await searchRes.json();
      const foundTeam = searchData.teams?.[0];

      if (!foundTeam) {
        return replyText(sock, jid, "Équipe introuvable.", msg);
      }

      const eventsRes = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsnext.php?id=${foundTeam.idTeam}`);
      const eventsData = await eventsRes.json();
      const events = eventsData.events || [];

      if (!events.length) {
        return replyText(sock, jid, "Aucun match à venir trouvé pour cette équipe.", msg);
      }

      let text = `📅 *Prochains matchs — ${foundTeam.strTeam}*\n\n`;
      events.slice(0, 5).forEach((e, i) => {
        text += `${i + 1}. *${e.strEvent}*\n`;
        text += `   📅 ${e.dateEvent} à ${e.strTime || '?'}\n`;
        text += `   🏆 ${e.strLeague || '?'}\n`;
        if (e.strVenue) text += `   📍 ${e.strVenue}\n`;
        text += '\n';
      });

      return replyText(sock, jid, text.trim(), msg);
    } catch (err) {
      console.error('[match] erreur:', err);
      return replyText(sock, jid, "Erreur en récupérant le prochain match.", msg);
    }
  }
};
