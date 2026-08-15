const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "weather",
  category: "search",
  description: "Météo actuelle d'une ville — .weather <ville>",

  dailyLimit: true,
  // Utilise Open-Meteo : gratuit, aucune clé API requise (contrairement à
  // OpenWeatherMap qui demande une inscription). 2 appels : geocoding pour
  // trouver les coordonnées, puis météo actuelle sur ces coordonnées.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const city = args.join(' ');

    if (!city) {
      return replyText(sock, jid, "Écris une ville, ex: .weather Abidjan", msg);
    }

    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
      const geoData = await geoRes.json();
      const place = geoData.results?.[0];

      if (!place) {
        return replyText(sock, jid, "Ville introuvable.", msg);
      }

      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current_weather=true`);
      const weatherData = await weatherRes.json();
      const current = weatherData.current_weather;

      const text = `🌤 *Météo à ${place.name}${place.country ? ', ' + place.country : ''}*\n` +
        `🌡 Température : ${current.temperature}°C\n` +
        `💨 Vent : ${current.windspeed} km/h`;

      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[weather] erreur:', err);
      return replyText(sock, jid, "Erreur en récupérant la météo.", msg);
    }
  }
};
