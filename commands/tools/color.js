const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'color',
  category: 'tools',
  description: 'Info couleur HEX — .color #A864FF',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let hex = (args[0] || '').replace(/^#/, '').toUpperCase();
    if (!/^[0-9A-F]{6}$/.test(hex)) {
      // random
      hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0').toUpperCase();
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return replyText(sock, jid,
      `🎨 *Couleur*\nHEX : \`#${hex}\`\nRGB : ${r}, ${g}, ${b}\n\n_Aperçu : utilise un color picker mobile._`,
      msg
    );
  }
};
