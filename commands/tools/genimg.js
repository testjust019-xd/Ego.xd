const config = require('../../config');
const { replyText, replyImage } = require('../../helpers/reply');

module.exports = {
  name: 'genimg',
  category: 'tools',
  description: 'Génère une image via Pollinations — .genimg <prompt>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const prompt = args.join(' ').trim();

    if (!prompt) {
      return replyText(sock, jid, 'Utilisation : `.genimg <description>`\nEx: `.genimg chat samouraï cyberpunk`', msg);
    }

    // Pollinations : URL directe, souvent sans clé
    const encoded = encodeURIComponent(prompt.slice(0, 300));
    let url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true`;
    if (config.pollinations?.apiKey) {
      url += `&key=${encodeURIComponent(config.pollinations.apiKey)}`;
    }

    try {
      await replyText(sock, jid, '🎨 Génération Pollinations en cours...', msg);
      const res = await fetch(url);
      if (!res.ok) {
        return replyText(sock, jid, `Erreur Pollinations (${res.status}). Réessaie avec un autre prompt.`, msg);
      }
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) {
        return replyText(sock, jid, 'Image trop petite / invalide. Réessaie.', msg);
      }
      return replyImage(sock, jid, buffer, `🎨 ${prompt.slice(0, 80)}`, msg);
    } catch (err) {
      console.error('[genimg]', err);
      return replyText(sock, jid, 'Erreur réseau en générant l\'image.', msg);
    }
  }
};
