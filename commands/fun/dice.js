const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "dice",
  category: "fun",
  description: "Lance un dé (1-6)",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const result = Math.floor(Math.random() * 6) + 1;
    return replyText(sock, jid, `🎲 Tu as fait un ${result} !`, msg);
  }
};
