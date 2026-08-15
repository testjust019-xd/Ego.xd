const { replyText } = require('../../helpers/reply');

const API_KEY = '3';

const LEAGUES = {
  ligue1: { id: 4334, name: 'Ligue 1' },
  premier: { id: 4328, name: 'Premier League' },
  liga: { id: 4335, name: 'La Liga' },
  seriea: { id: 4332, name: 'Serie A' },
  bundesliga: { id: 4331, name: 'Bundesliga' },
  ligue2: { id: 4337, name: 'Ligue 2' },
  eredivisie: { id: 4337, name: 'Eredivisie' },
  championship: { id: 4329, name: 'Championship' }
};

module.exports = {
  name: 'fclassement',
  category: 'foot',
  description: 'Classement d\'une ligue — .fclassement <ligue>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const key = (args[0] || 'ligue1').toLowerCase().replace(/\s+/g, '');

    if (!args[0] || key === 'help' || key === 'aide') {
      return replyText(sock, jid,
        '📊 *Classement ligue*\n\n' +
        '`.fclassement ligue1`\n`.fclassement premier`\n`.fclassement liga`\n' +
        '`.fclassement seriea`\n`.fclassement bundesliga`\n\n' +
        '_Note : couverture TheSportsDB parfois incomplète selon la saison._',
        msg
      );
    }

    const league = LEAGUES[key];
    if (!league) {
      return replyText(sock, jid, 'Ligue inconnue. Tape `.fclassement` pour la liste.', msg);
    }

    try {
      // table par saison courante approximative
      const year = new Date().getUTCFullYear();
      const season = new Date().getUTCMonth() >= 6 ? `${year}-${year + 1}` : `${year - 1}-${year}`;

      let table = null;
      for (const s of [season, `${year}-${year + 1}`, `${year - 1}-${year}`, String(year)]) {
        const res = await fetch(
          `https://www.thesportsdb.com/api/v1/json/${API_KEY}/lookuptable.php?l=${league.id}&s=${s}`
        );
        const data = await res.json();
        if (data.table?.length) {
          table = data.table;
          break;
        }
      }

      if (!table?.length) {
        return replyText(sock, jid,
          `Classement *${league.name}* indisponible pour le moment (API limitée).\nEssaie une autre ligue ou reviens plus tard.`,
          msg
        );
      }

      let text = `📊 *Classement — ${league.name}*\n\n`;
      table.slice(0, 20).forEach((row) => {
        const pos = row.intRank || row.rank || '?';
        const pts = row.intPoints ?? row.points ?? '?';
        const j = row.intPlayed ?? row.played ?? '?';
        text += `${pos}. *${row.strTeam}* — ${pts} pts (${j} j)\n`;
      });

      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[fclassement]', err);
      return replyText(sock, jid, 'Erreur classement.', msg);
    }
  }
};
