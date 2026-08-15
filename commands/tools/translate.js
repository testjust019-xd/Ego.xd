const { replyText } = require('../../helpers/reply');

module.exports = {
  name: "translate",
  category: "tools",
  description: "Traduit un texte — .translate <code langue> <texte>",

  dailyLimit: true,
  // MyMemory Translation API : gratuite, sans clé (limite quotidienne
  // raisonnable pour un usage perso). Codes langue format court : fr, en, es...
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const targetLang = args[0];
    const text = args.slice(1).join(' ');

    if (!targetLang || !text) {
      return replyText(sock, jid, "Utilisation : .translate <code langue> <texte>\nEx: .translate en Bonjour tout le monde", msg);
    }

    try {
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|${targetLang}`);
      const data = await res.json();
      const translated = data.responseData?.translatedText;

      if (!translated) {
        return replyText(sock, jid, "Erreur de traduction.", msg);
      }

      return replyText(sock, jid, `🌐 ${translated}`, msg);
    } catch (err) {
      console.error('[translate] erreur:', err);
      return replyText(sock, jid, "Erreur en contactant le service de traduction.", msg);
    }
  }
};
