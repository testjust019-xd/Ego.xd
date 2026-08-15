const { replyMedia } = require('../../helpers/reply');

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
}

module.exports = {
  name: "uptime",
  category: "general",
  description: "Depuis combien de temps le bot tourne",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    return replyMedia(sock, jid, 'uptime', `⏱ Uptime : ${formatUptime(process.uptime())}`, msg);
  }
};
