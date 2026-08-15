const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'pairlink',
  aliases: ['pairweb', 'weblink'],
  category: 'general',
  description: "Lien de la page web de pairing (comme .pair mais via le site)",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const url = (process.env.PUBLIC_URL || config.publicUrl || '').replace(/\/$/, '');

    if (!url) {
      return replyText(
        sock,
        jid,
        '⚠️ Aucun lien public configuré.\n\n' +
          '1. Déploie le bot sur Render (`node start.js`)\n' +
          '2. Mets l\'URL dans `config.js` → `publicUrl: "https://ton-service.onrender.com"`\n' +
          '   ou la variable d\'environnement `PUBLIC_URL`\n\n' +
          'Ensuite la page fonctionne comme `.pair` :\n' +
          'entre ton numéro → code WhatsApp → Appareils liés.',
        msg
      );
    }

    return replyText(
      sock,
      jid,
      `🌐 *Page de pairing EGO.XD*\n${url}\n\n` +
        `1. Ouvre le lien\n` +
        `2. Entre ton numéro (ex: 22507…)\n` +
        `3. Clique *AWAKEN EGO*\n` +
        `4. WhatsApp → Appareils liés → Lier avec un numéro → entre le code\n\n` +
        `_Même moteur que la commande .pair (session Baileys + requestPairingCode)._`,
      msg
    );
  }
};
