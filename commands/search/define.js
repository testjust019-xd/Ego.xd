const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "define",
  category: "search",
  description: "Définition d'un mot (anglais) — .define <mot>",

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const word = args[0];

    if (!word) {
      return replyText(sock, jid, "Écris un mot, ex: .define hello", msg);
    }

    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
      if (!res.ok) throw new Error('non trouvé');
      const data = await res.json();
      const meaning = data[0]?.meanings?.[0];
      const definition = meaning?.definitions?.[0]?.definition || "Pas de définition trouvée.";
      return replyText(sock, jid, `📚 *${word}* (${meaning?.partOfSpeech || '?'})\n${definition}`, msg);
    } catch (err) {
      return replyText(sock, jid, "Mot introuvable (essaie en anglais).", msg);
    }
  }
};
