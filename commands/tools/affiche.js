const config = require('../../config');
const { replyText, replyImage } = require('../../helpers/reply');

module.exports = {
  name: 'affiche',
  category: 'tools',
  description: 'Génère une affiche / poster — .affiche <sujet>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const subject = args.join(' ').trim();
    if (!subject) {
      return replyText(sock, jid,
        'Utilisation : `.affiche <sujet>`\n' +
        'Ex: `.affiche concert Afrobeat Abidjan samedi`\n' +
        'Ex: `.affiche match finale coupe du monde style cinema`',
        msg
      );
    }

    const prompt =
      `Cinematic event poster, vertical movie poster layout, dramatic lighting, ` +
      `bold typography space, professional graphic design, high detail, ` +
      `promotional flyer aesthetic, no watermark: ${subject.slice(0, 220)}`;

    const encoded = encodeURIComponent(prompt);
    let url = `https://image.pollinations.ai/prompt/${encoded}?width=768&height=1280&nologo=true&enhance=true`;
    if (config.pollinations?.apiKey) url += `&key=${encodeURIComponent(config.pollinations.apiKey)}`;

    try {
      await replyText(sock, jid, '🖼️ Création de l\'affiche…', msg);
      const res = await fetch(url);
      if (!res.ok) return replyText(sock, jid, `Erreur (${res.status}). Réessaie.`, msg);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) return replyText(sock, jid, 'Affiche invalide, réessaie.', msg);
      return replyImage(sock, jid, buffer, `🖼️ Affiche : ${subject.slice(0, 70)}`, msg);
    } catch (err) {
      console.error('[affiche]', err);
      return replyText(sock, jid, 'Erreur réseau.', msg);
    }
  }
};
