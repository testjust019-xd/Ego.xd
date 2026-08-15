const { replyImage, replyText } = require('../../helpers/reply');

module.exports = {
  name: "img",
  category: "search",
  description: "Cherche une image libre de droits — .img <recherche>",

  dailyLimit: true,
  // Utilise Openverse (openverse.org, projet officiel WordPress), moteur de
  // recherche d'images sous licence Creative Commons — API publique
  // gratuite, sans clé, et légale (pas de scraping de contenu protégé).
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const query = args.join(' ');

    if (!query) {
      return replyText(sock, jid, "Écris une recherche, ex: .img chat", msg);
    }

    try {
      const res = await fetch(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&page_size=1`);
      const data = await res.json();
      const result = data.results?.[0];

      if (!result) {
        return replyText(sock, jid, "Aucune image trouvée.", msg);
      }

      const caption = `🖼 "${query}"\n📸 ${result.creator || 'Inconnu'} — ${(result.license || '').toUpperCase()}`;
      return replyImage(sock, jid, { url: result.url }, caption, msg);
    } catch (err) {
      console.error('[img] erreur:', err);
      return replyText(sock, jid, "Erreur en cherchant l'image.", msg);
    }
  }
};
