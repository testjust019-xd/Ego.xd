const { replyText } = require('../../helpers/reply');

const API_KEY = '3';

module.exports = {
  name: "score",
  category: "foot",
  description: "Derniers scores d'une équipe — .score <equipe>",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const team = args.join(' ');

    if (!team) {
      return replyText(sock, jid, "Écris une équipe, ex: `.score ASEC Mimosas`", msg);
    }

    try {
      const searchRes = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(team)}`);
      const searchData = await searchRes.json();
      const foundTeam = searchData.teams?.[0];

      if (!foundTeam) {
        return replyText(sock, jid, "Équipe introuvable.", msg);
      }

      const eventsRes = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventslast.php?id=${foundTeam.idTeam}`);
      const eventsData = await eventsRes.json();
      const events = eventsData.results || [];

      if (!events.length) {
        return replyText(sock, jid, "Aucun match récent trouvé pour cette équipe.", msg);
      }

      let text = `⚽ *Derniers matchs — ${foundTeam.strTeam}*\n\n`;
      events.slice(0, 5).forEach((e, i) => {
        text += `${i + 1}. *${e.strEvent}*\n`;
        text += `   📊 ${e.intHomeScore ?? '?'} - ${e.intAwayScore ?? '?'}\n`;
        text += `   📅 ${e.dateEvent} · 🏆 ${e.strLeague || '?'}\n\n`;
      });

      return replyText(sock, jid, text.trim(), msg);
    } catch (err) {
      console.error('[score] erreur:', err);
      return replyText(sock, jid, "Erreur en récupérant le score.", msg);
    }
  }
};
