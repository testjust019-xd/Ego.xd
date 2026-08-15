const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'screenshot',
  category: 'tools',
  description: 'Capture d\'écran d\'un site — .screenshot <url>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const url = args[0];
    if (!url || !/^https?:\/\//i.test(url)) {
      return replyText(sock, jid, 'Ex: `.screenshot https://example.com`', msg);
    }
    try {
      const shot = 'https://image.thum.io/get/width/800/crop/900/' + encodeURIComponent(url);
      await sock.sendMessage(jid, {
        image: { url: shot },
        caption: '🖼 Screenshot\n' + url
      }, { quoted: msg });
    } catch (err) {
      console.error('[screenshot]', err);
      return replyText(sock, jid, 'Impossible de capturer (service indisponible ou URL bloquée).', msg);
    }
  }
};
