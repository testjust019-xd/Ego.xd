const { replyText } = require('../../helpers/reply');

const ROASTS = [
  "T'es tellement lent que même le buffering te dépasse.",
  "T'as le charisme d'un mot de passe oublié.",
  "Si la lenteur était un sport, t'aurais une médaille... livrée en retard.",
  "T'es pas nul, juste... expérimental.",
  "Même le Wi-Fi public a plus de connexion que toi."
];

module.exports = {
  name: "roast",
  category: "fun",
  description: "Envoie une pique humoristique aléatoire",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
    return replyText(sock, jid, `🔥 ${roast}`, msg);
  }
};
