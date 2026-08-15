const { downloadContentFromMessage } = require('baron-baileys-v2');
const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "shazam",
  category: "tools",
  description: "Identifie une chanson depuis un audio/vidéo (réponds à un message avec .shazam)",

  dailyLimit: true,
  // ⚠️ Nécessite une clé AudD gratuite (audd.io, inscription sans CB).
  // Pas de vrai "Shazam gratuit et illimité" fiable — AudD est l'option la
  // plus honnête que je connaisse (free tier limité mais réel, pas du scraping).
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

    const target = quoted?.audioMessage ? { type: 'audio', node: quoted.audioMessage }
      : quoted?.videoMessage ? { type: 'video', node: quoted.videoMessage }
      : null;

    if (!target) {
      return replyText(sock, jid, "Réponds à un audio ou une vidéo avec .shazam", msg);
    }

    if (!config.audd.apiKey || config.audd.apiKey === "TA_CLE_AUDD_ICI") {
      return replyText(sock, jid, "⚠️ .shazam a besoin d'une clé AudD gratuite. Inscris-toi sur https://audd.io puis ajoute la clé dans config.js -> audd.apiKey.", msg);
    }

    try {
      const stream = await downloadContentFromMessage(target.node, target.type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      const form = new FormData();
      form.append('api_token', config.audd.apiKey);
      form.append('file', new Blob([buffer]), 'audio.mp4');
      form.append('return', 'apple_music,spotify');

      const res = await fetch('https://api.audd.io/', { method: 'POST', body: form });
      const data = await res.json();

      if (!data.result) {
        return replyText(sock, jid, "Chanson non reconnue (essaie avec un extrait plus long ou plus clair).", msg);
      }

      const r = data.result;
      const text = `🎧 *${r.title}*\n👤 ${r.artist}\n💿 ${r.album || 'Album inconnu'}`;
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[shazam] erreur:', err);
      return replyText(sock, jid, "Erreur en identifiant la musique.", msg);
    }
  }
};
