const { replyText } = require('../../helpers/reply');

const API_KEY = '3';

const LEAGUES = {
  ligue1: 4334,
  premier: 4328,
  liga: 4335,
  seriea: 4332,
  bundesliga: 4331,
  champions: 4480
};

module.exports = {
  name: 'buteurs',
  category: 'foot',
  description: 'Meilleurs buteurs — .buteurs [ligue]',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const key = (args[0] || 'ligue1').toLowerCase();
    const leagueId = LEAGUES[key] || LEAGUES.ligue1;

    try {
      const year = new Date().getUTCFullYear();
      const season = new Date().getUTCMonth() >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      // TheSportsDB: top scorers endpoint (peut être vide selon ligue/saison)
      let scorers = [];
      for (const s of [season, String(year), `${year - 1}-${year}`]) {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${API_KEY}/lookuptable.php?l=${leagueId}&s=${s}`
        );
        // fallback: search events + can't aggregate easily — use players search alternative
        break;
      }

      // Alternative fiable : derniers matchs de la ligue + message honnête
      const pastRes = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventspastleague.php?id=${leagueId}`
      );
      const pastData = await pastRes.json();
      const events = (pastData.events || []).slice(0, 8);

      if (!events.length) {
        return replyText(sock, jid,
          'Classement buteurs non fourni par l\'API gratuite pour cette ligue.\n' +
          'Essaie `.joueur <nom>` pour une fiche individuelle.\n' +
          'Ligues : ligue1 · premier · liga · seriea · bundesliga · champions',
          msg
        );
      }

      let text = `⚽ *Derniers matchs (proxy buteurs)*\n_Ligue demandée : ${key}_\n\n`;
      events.forEach((e, i) => {
        text += `${i + 1}. ${e.strHomeTeam} ${e.intHomeScore ?? '?'}-${e.intAwayScore ?? '?'} ${e.strAwayTeam}\n`;
        text += `   ${e.dateEvent}\n`;
      });
      text += `\n_Pour un joueur précis :_ \`.joueur Mbappé\``;
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[buteurs]', err);
      return replyText(sock, jid, 'Erreur buteurs.', msg);
    }
  }
};
