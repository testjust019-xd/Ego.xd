const { replyText } = require('../../helpers/reply');
const API_KEY = '3';

module.exports = {
  name: 'compo',
  category: 'foot',
  description: 'Composition / effectif connu — .compo <equipe>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const team = args.join(' ').trim();
    if (!team) return replyText(sock, jid, 'Ex: `.compo PSG`', msg);

    try {
      const search = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(team)}`).then(r => r.json());
      const t = search.teams?.[0];
      if (!t) return replyText(sock, jid, 'Équipe introuvable.', msg);

      const players = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/lookup_all_players.php?id=${t.idTeam}`).then(r => r.json());
      const list = players.player || [];
      if (!list.length) {
        return replyText(sock, jid, `Pas d'effectif détaillé pour *${t.strTeam}* dans la base.`, msg);
      }

      // group by position
      const byPos = {};
      for (const p of list) {
        const pos = p.strPosition || 'Autre';
        if (!byPos[pos]) byPos[pos] = [];
        byPos[pos].push(p.strPlayer);
      }

      let text = `📋 *Effectif — ${t.strTeam}*\n`;
      if (t.strStadium) text += `🏟 ${t.strStadium}\n`;
      text += '\n';
      const order = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward', 'Manager'];
      const shown = new Set();
      for (const pos of order) {
        if (!byPos[pos]) continue;
        shown.add(pos);
        text += `*${pos}*\n`;
        text += byPos[pos].slice(0, 12).map(n => `· ${n}`).join('\n') + '\n\n';
      }
      for (const [pos, names] of Object.entries(byPos)) {
        if (shown.has(pos)) continue;
        text += `*${pos}*\n`;
        text += names.slice(0, 8).map(n => `· ${n}`).join('\n') + '\n\n';
      }
      if (text.length > 3500) text = text.slice(0, 3500) + '\n…';
      return replyText(sock, jid, text.trim(), msg);
    } catch (err) {
      console.error('[compo]', err);
      return replyText(sock, jid, 'Erreur composition.', msg);
    }
  }
};
