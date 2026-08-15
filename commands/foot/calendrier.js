const { replyText } = require('../../helpers/reply');

const API_KEY = '3';

module.exports = {
  name: 'calendrier',
  category: 'foot',
  description: 'Prochains matchs d\'une équipe — .calendrier <equipe>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const team = args.join(' ').trim();
    if (!team) {
      return replyText(sock, jid, 'Ex: `.calendrier Real Madrid`', msg);
    }

    try {
      const searchRes = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(team)}`
      );
      const searchData = await searchRes.json();
      const found = searchData.teams?.[0];
      if (!found) {
        return replyText(sock, jid, 'Équipe introuvable.', msg);
      }

      const eventsRes = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsnext.php?id=${found.idTeam}`
      );
      const eventsData = await eventsRes.json();
      const events = eventsData.events || [];

      if (!events.length) {
        return replyText(sock, jid, `Aucun match à venir pour *${found.strTeam}*.`, msg);
      }

      let text = `📅 *Prochains matchs — ${found.strTeam}*\n\n`;
      events.slice(0, 8).forEach((e, i) => {
        text += `${i + 1}. *${e.strEvent}*\n`;
        text += `   📆 ${e.dateEvent} ${e.strTime || ''}\n`;
        text += `   🏆 ${e.strLeague || '?'}\n`;
        if (e.strVenue) text += `   📍 ${e.strVenue}\n`;
        text += '\n';
      });

      return replyText(sock, jid, text.trim(), msg);
    } catch (err) {
      console.error('[calendrier]', err);
      return replyText(sock, jid, 'Erreur calendrier.', msg);
    }
  }
};
