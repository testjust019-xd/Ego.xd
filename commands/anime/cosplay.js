const { replyText } = require('../../helpers/reply');

module.exports = {
  name: 'cosplay',
  category: 'anime',
  description: 'Image cosplay aléatoire (anime) — .cosplay',

  dailyLimit: true,
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      // waifu.pics / nekos style SFW
      const res = await fetch('https://api.waifu.pics/sfw/waifu');
      const data = await res.json();
      if (!data.url) throw new Error('no url');
      await sock.sendMessage(jid, {
        image: { url: data.url },
        caption: '🎭 Cosplay / waifu aléatoire (SFW)'
      }, { quoted: msg });
    } catch (err) {
      console.error('[cosplay]', err);
      return replyText(sock, jid, 'Image indisponible pour le moment.', msg);
    }
  }
};
