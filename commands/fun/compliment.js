const { replyText } = require('../../helpers/reply');

const COMPLIMENTS = [
  "T'es quelqu'un de solide, continue comme ça 💪",
  "Ton énergie fait du bien, sérieux.",
  "T'as clairement du potentiel, ne lâche rien.",
  "T'es plus fort que tu ne le penses.",
  "Aujourd'hui c'est ton jour, fonce !"
];

module.exports = {
  name: "compliment",
  category: "fun",
  description: "Reçois un compliment aléatoire",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const compliment = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
    return replyText(sock, jid, `✨ ${compliment}`, msg);
  }
};
