const config = require('../../config');
const { replyText, replyImage } = require('../../helpers/reply');

module.exports = {
  name: 'logo2',
  category: 'tools',
  description: 'Génère un logo IA — .logo2 <nom / description>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const idea = args.join(' ').trim();
    if (!idea) {
      return replyText(sock, jid,
        'Utilisation : `.logo2 <nom ou description>`\n' +
        'Ex: `.logo2 Arise XD esport violet`\n' +
        'Ex: `.logo2 café lune minimaliste`',
        msg
      );
    }

    const prompt =
      `Professional brand logo design, clean vector style, centered, ` +
      `high quality, simple memorable icon, white or transparent background, ` +
      `modern branding, no mockup, no photo of person, logo only: ${idea.slice(0, 200)}`;

    const encoded = encodeURIComponent(prompt);
    let url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true`;
    if (config.pollinations?.apiKey) url += `&key=${encodeURIComponent(config.pollinations.apiKey)}`;

    try {
      await replyText(sock, jid, '🎨 Génération du logo…', msg);
      const res = await fetch(url);
      if (!res.ok) return replyText(sock, jid, `Erreur génération (${res.status}).`, msg);
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) return replyText(sock, jid, 'Image invalide, réessaie.', msg);
      return replyImage(sock, jid, buffer, `🏷️ Logo généré : ${idea.slice(0, 60)}`, msg);
    } catch (err) {
      console.error('[logo2]', err);
      return replyText(sock, jid, 'Erreur réseau.', msg);
    }
  }
};
