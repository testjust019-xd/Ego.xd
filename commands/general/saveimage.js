const { downloadContentFromMessage } = require('baron-baileys-v2');
const fs = require('fs');
const path = require('path');
const { replyText } = require('../../helpers/reply');
const { isOwner } = require('../../lib/groupHelpers');

module.exports = {
  name: "saveimage",
  category: "general",
  description: "Sauvegarde une image dans le projet pour la réutiliser (owner) — réponds à une image avec .saveimage <nom>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, "Seul le owner peut utiliser .saveimage", msg);
    }

    const name = args[0];
    if (!name) {
      return replyText(sock, jid, "Donne un nom, ex: .saveimage banniere (en répondant à une image)", msg);
    }

    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const target = quoted?.imageMessage || msg.message?.imageMessage;

    if (!target) {
      return replyText(sock, jid, "Réponds à une image (ou envoie-la en même temps que la commande) avec .saveimage <nom>", msg);
    }

    try {
      const stream = await downloadContentFromMessage(target, 'image');
      let buffer = Buffer.from([]);
      for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

      const dir = path.join(__dirname, '..', '..', 'assets', 'custom');
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${name}.png`);
      fs.writeFileSync(filePath, buffer);

      return replyText(
        sock, jid,
        `✅ Image sauvegardée : assets/custom/${name}.png\n\nPour l'utiliser dans une commande :\nreplyImage(sock, jid, './assets/custom/${name}.png', "ta légende", msg)`,
        msg
      );
    } catch (err) {
      console.error('[saveimage] erreur:', err);
      return replyText(sock, jid, "Erreur en sauvegardant l'image.", msg);
    }
  }
};
