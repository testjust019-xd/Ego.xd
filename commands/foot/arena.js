const { replyText } = require('../../helpers/reply');
const API_KEY = '3';

module.exports = {
  name: 'arena',
  category: 'foot',
  description: 'Infos stade — .arena <nom ou equipe>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const q = args.join(' ').trim();
    if (!q) return replyText(sock, jid, 'Ex: `.arena Camp Nou` ou `.arena Barcelona`', msg);

    try {
      // try as team first
      const search = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(q)}`).then(r => r.json());
      const t = search.teams?.[0];
      if (t && t.strStadium) {
        let text = `🏟 *${t.strStadium}*\n`;
        text += `⚽ Club : ${t.strTeam}\n`;
        if (t.intStadiumCapacity) text += `👥 Capacité : ${Number(t.intStadiumCapacity).toLocaleString('fr-FR')}\n`;
        if (t.strStadiumLocation) text += `📍 ${t.strStadiumLocation}\n`;
        if (t.strCountry) text += `🌍 ${t.strCountry}\n`;
        if (t.strStadiumDescription) text += `\n_${String(t.strStadiumDescription).slice(0, 400)}_`;
        return replyText(sock, jid, text.trim(), msg);
      }

      // search venues
      const v = await fetch(`https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchvenues.php?v=${encodeURIComponent(q)}`).then(r => r.json());
      const venue = v.venues?.[0];
      if (!venue) return replyText(sock, jid, 'Stade introuvable.', msg);
      let text = `🏟 *${venue.strVenue}*\n`;
      if (venue.intCapacity) text += `👥 Capacité : ${Number(venue.intCapacity).toLocaleString('fr-FR')}\n`;
      if (venue.strLocation) text += `📍 ${venue.strLocation}\n`;
      if (venue.strCountry) text += `🌍 ${venue.strCountry}\n`;
      return replyText(sock, jid, text.trim(), msg);
    } catch (err) {
      console.error('[arena]', err);
      return replyText(sock, jid, 'Erreur stade.', msg);
    }
  }
};
