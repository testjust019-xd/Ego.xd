const { replyText, replyImage } = require('../../helpers/reply');

const API_KEY = '3';

async function fetchImg(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ARISE-XD-Bot' }, redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800) return null;
    return buf;
  } catch {
    return null;
  }
}

module.exports = {
  name: 'equipe',
  category: 'foot',
  description: 'Fiche d\'un club avec badge — .equipe <nom>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const team = args.join(' ').trim();
    if (!team) {
      return replyText(sock, jid, 'Ex: `.equipe ASEC Mimosas`', msg);
    }

    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchteams.php?t=${encodeURIComponent(team)}`
      );
      const data = await res.json();
      const t = data.teams?.[0];
      if (!t) {
        return replyText(sock, jid, 'Équipe introuvable.', msg);
      }

      let text = `🏟️ *${t.strTeam}*\n`;
      if (t.strLeague) text += `🏆 Ligue : ${t.strLeague}\n`;
      if (t.strCountry) text += `🌍 Pays : ${t.strCountry}\n`;
      if (t.strStadium) text += `📍 Stade : ${t.strStadium}`;
      if (t.intStadiumCapacity) text += ` (${Number(t.intStadiumCapacity).toLocaleString('fr-FR')} places)`;
      text += '\n';
      if (t.strManager) text += `👔 Coach : ${t.strManager}\n`;
      if (t.intFormedYear) text += `📆 Fondé : ${t.intFormedYear}\n`;
      if (t.strWebsite) text += `🌐 ${t.strWebsite}\n`;
      if (t.strDescriptionFR || t.strDescriptionEN) {
        const desc = (t.strDescriptionFR || t.strDescriptionEN || '').slice(0, 300);
        text += `\n_${desc}${desc.length >= 300 ? '…' : ''}_`;
      }

      const imgUrl = t.strBadge || t.strLogo || t.strTeamBadge || t.strBanner;
      const img = await fetchImg(imgUrl);
      if (img) {
        return replyImage(sock, jid, img, text, msg);
      }
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[equipe]', err);
      return replyText(sock, jid, 'Erreur fiche équipe.', msg);
    }
  }
};
