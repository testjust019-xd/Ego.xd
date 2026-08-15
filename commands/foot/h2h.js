const { replyText } = require('../../helpers/reply');
const API_KEY = '3';

module.exports = {
  name: 'h2h',
  category: 'foot',
  description: 'Historique confrontations directes — .h2h <equipe1> <equipe2>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const raw = args.join(' ').trim();
    if (!raw || !raw.includes(' ')) {
      return replyText(sock, jid, 'Ex: `.h2h ASEC vs Africa United` ou `.h2h Real Madrid Barcelona`', msg);
    }
    const parts = raw.split(/\s+vs\s+|\s+contre\s+|\s+/i);
    // better split
    let t1, t2;
    const vs = raw.split(/\s+vs\s+|\s+contre\s+/i);
    if (vs.length === 2) {
      t1 = vs[0].trim(); t2 = vs[1].trim();
    } else {
      // half split
      const mid = Math.ceil(args.length / 2);
      t1 = args.slice(0, mid).join(' ');
      t2 = args.slice(mid).join(' ');
    }
    if (!t1 || !t2) return replyText(sock, jid, 'Donne deux équipes.', msg);

    try {
      await replyText(sock, jid, '⚽ Recherche H2H…', msg);
      const s1 = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(t1)}`).then(r => r.json());
      const s2 = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(t2)}`).then(r => r.json());
      const team1 = s1.teams?.[0];
      const team2 = s2.teams?.[0];
      if (!team1 || !team2) return replyText(sock, jid, 'Une des équipes est introuvable.', msg);

      // last events for team1, filter opponents matching team2
      const ev = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventslast.php?id=${team1.idTeam}`).then(r => r.json());
      const all = (ev.results || []).filter(e =>
        (e.idHomeTeam === team2.idTeam || e.idAwayTeam === team2.idTeam) ||
        (String(e.strHomeTeam || '').toLowerCase().includes(team2.strTeam.toLowerCase().slice(0, 6)) ||
         String(e.strAwayTeam || '').toLowerCase().includes(team2.strTeam.toLowerCase().slice(0, 6)))
      );

      // also search team2 last events
      const ev2 = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/eventslast.php?id=${team2.idTeam}`).then(r => r.json());
      const more = (ev2.results || []).filter(e =>
        e.idHomeTeam === team1.idTeam || e.idAwayTeam === team1.idTeam
      );
      const seen = new Set();
      const matches = [];
      for (const e of [...all, ...more]) {
        const k = e.idEvent || `${e.dateEvent}-${e.strEvent}`;
        if (seen.has(k)) continue;
        seen.add(k);
        matches.push(e);
      }
      matches.sort((a, b) => String(b.dateEvent).localeCompare(String(a.dateEvent)));

      let text = `⚔️ *H2H — ${team1.strTeam} vs ${team2.strTeam}*\n\n`;
      if (!matches.length) {
        text += '_Aucun match récent trouvé dans les 5 derniers de chaque équipe._\n';
        text += 'Essaie des noms plus officiels (ex: Real Madrid, FC Barcelona).';
      } else {
        for (const e of matches.slice(0, 8)) {
          text += `📅 ${e.dateEvent || '?'}\n`;
          text += `   ${e.strHomeTeam} ${e.intHomeScore ?? '?'} - ${e.intAwayScore ?? '?'} ${e.strAwayTeam}\n`;
          text += `   🏆 ${e.strLeague || '?'}\n\n`;
        }
      }
      return replyText(sock, jid, text.trim(), msg);
    } catch (err) {
      console.error('[h2h]', err);
      return replyText(sock, jid, 'Erreur H2H.', msg);
    }
  }
};
