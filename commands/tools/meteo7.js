const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'meteo7',
  category: 'tools',
  description: 'Prévisions météo 7 jours — .meteo7 <ville>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const city = args.join(' ').trim() || 'Abidjan';
    try {
      const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`).then(r => r.json());
      const place = geo.results?.[0];
      if (!place) return replyText(sock, jid, 'Ville introuvable.', msg);
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7`;
      const w = await fetch(url).then(r => r.json());
      const d = w.daily;
      let text = `📅 *Météo 7j — ${place.name}*\n\n`;
      for (let i = 0; i < (d.time || []).length; i++) {
        text += `*${d.time[i]}*\n`;
        text += `  🌡 ${d.temperature_2m_min[i]}° → ${d.temperature_2m_max[i]}°\n`;
        text += `  🌧 ${d.precipitation_sum[i]} mm\n`;
      }
      return replyText(sock, jid, text.trim(), msg);
    } catch (err) {
      console.error('[meteo7]', err);
      return replyText(sock, jid, 'Erreur météo.', msg);
    }
  }
};
