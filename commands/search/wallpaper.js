const { replyImage, replyText } = require('../../helpers/reply');

module.exports = {
  name: "wallpaper",
  category: "search",
  description: "Fond d'écran par thème — .wallpaper <theme>",

  dailyLimit: true,
  // Réutilise Openverse (comme .img), en ajoutant "wallpaper" à la requête
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return replyText(sock, jid, "Écris un thème, ex: .wallpaper montagne", msg);
    }

    try {
      const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query + ' wallpaper')}&page_size=1`);
      const data = await res.json();
      const result = data.results?.[0];

      if (!result) {
        return replyText(sock, jid, "Aucun fond d'écran trouvé.", msg);
      }

      return replyImage(sock, jid, { url: result.url }, `🖼 Fond d'écran : ${query}`, msg);
    } catch (err) {
      console.error('[wallpaper] erreur:', err);
      return replyText(sock, jid, "Erreur en cherchant l'image.", msg);
    }
  }
};
