const config = require('../../config');
const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "script",
  category: "general",
  description: "Informations sur le projet du bot",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const text = `📦 *${config.botName}*\n` +
      `👨‍💻 Développeur : Dylan\n` +
      `⚙️ Basé sur : Node.js + Baileys\n` +
      `🎨 Thème actif : ${config.defaultTheme}`;

    return replyText(sock, jid, text, msg);
  }
};
