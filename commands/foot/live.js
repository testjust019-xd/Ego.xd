const { replyText } = require('../../helpers/reply');

const API_KEY = '3';

// Quelques ligues populaires (id TheSportsDB)
const LEAGUES = {
  'ligue1': 4334,
  'premier': 4328,
  'liga': 4335,
  'seriea': 4332,
  'bundesliga': 4331,
  'champions': 4480,
  'ligue1ci': 4683,
  'caf': 4481
};

module.exports = {
  name: 'live',
  category: 'foot',
  description: 'Matchs du jour / scores récents — .live [ligue]',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const q = (args[0] || '').toLowerCase().replace(/\s+/g, '');

    try {
      await replyText(sock, jid, '⚽ Recherche des matchs…', msg);

      const today = new Date();
      const yyyy = today.getUTCFullYear();
      const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(today.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      let events = [];

      if (q && LEAGUES[q]) {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsday.php?d=${dateStr}&l=${LEAGUES[q]}`
        );
        const data = await res.json();
        events = data.events || [];
      } else {
        // Matchs du jour (toutes compétitions couvertes)
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventsday.php?d=${dateStr}`
        );
        const data = await res.json();
        events = (data.events || []).slice(0, 15);
      }

      if (!events.length) {
        // Fallback : derniers résultats d'une ligue connue
        const leagueId = LEAGUES[q] || LEAGUES.ligue1;
        const res2 = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventspastleague.php?id=${leagueId}`
        );
        const data2 = await res2.json();
        events = (data2.events || []).slice(0, 10);
        if (!events.length) {
          return replyText(sock, jid,
            'Aucun match trouvé pour aujourd\'hui.\n' +
            'Essaie : `.live ligue1` · `.live premier` · `.live liga` · `.live seriea` · `.live bundesliga` · `.live champions`',
            msg
          );
        }
      }

      let text = `⚽ *Matchs — ${dateStr}*\n\n`;
      events.slice(0, 12).forEach((e, i) => {
        const score =
          e.intHomeScore != null && e.intAwayScore != null
            ? `${e.intHomeScore}-${e.intAwayScore}`
            : (e.strStatus || 'à venir');
        text += `${i + 1}. *${e.strHomeTeam}* ${score} *${e.strAwayTeam}*\n`;
        text += `   🏆 ${e.strLeague || '?'} · ${e.strTime || e.dateEvent || ''}\n`;
      });

      text += `\n_Filtres : ligue1 · premier · liga · seriea · bundesliga · champions_`;
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[live]', err);
      return replyText(sock, jid, 'Erreur en récupérant les matchs.', msg);
    }
  }
};
