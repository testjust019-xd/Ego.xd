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
  name: 'joueur',
  category: 'foot',
  description: 'Fiche joueur avec photo — .joueur <nom>',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const name = args.join(' ').trim();
    if (!name) {
      return replyText(sock, jid, 'Ex: `.joueur Kylian Mbappé`', msg);
    }

    try {
      const res = await fetch(
        `https://www.thesportsdb.com/api/v1/json/${API_KEY}/searchplayers.php?p=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      const p = data.player?.[0];
      if (!p) {
        return replyText(sock, jid, 'Joueur introuvable.', msg);
      }

      let text = `👤 *${p.strPlayer}*\n`;
      if (p.strNationality) text += `🏳️ ${p.strNationality}\n`;
      if (p.strTeam) text += `🏟️ Club : ${p.strTeam}\n`;
      if (p.strPosition) text += `📍 Poste : ${p.strPosition}\n`;
      if (p.dateBorn) text += `🎂 Né : ${p.dateBorn}\n`;
      if (p.strHeight) text += `📏 Taille : ${p.strHeight}\n`;
      if (p.strWage) text += `💰 ${p.strWage}\n`;
      if (p.strDescriptionEN || p.strDescriptionFR) {
        const desc = (p.strDescriptionFR || p.strDescriptionEN || '').slice(0, 280);
        text += `\n_${desc}${desc.length >= 280 ? '…' : ''}_`;
      }

      // Photo joueur (cutout > thumb > render)
      const imgUrl = p.strCutout || p.strThumb || p.strRender || p.strBanner;
      const img = await fetchImg(imgUrl);
      if (img) {
        return replyImage(sock, jid, img, text, msg);
      }
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[joueur]', err);
      return replyText(sock, jid, 'Erreur en récupérant le joueur.', msg);
    }
  }
};
