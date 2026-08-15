const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "fact",
  category: "fun",
  description: "Fait insolite aléatoire (en anglais)",

  // uselessfacts.jsph.pl : API publique gratuite, sans clé
  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    try {
      const res = await fetch("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en");
      const data = await res.json();
      return replyText(sock, jid, `🧠 ${data.text}`, msg);
    } catch (err) {
      return replyText(sock, jid, "Erreur, réessaie.", msg);
    }
  }
};
