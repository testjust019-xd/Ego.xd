const { replyText } = require('../../helpers/reply');

const JOKES = [
  "Pourquoi les développeurs confondent Halloween et Noël ? Parce que OCT 31 == DEC 25.",
  "Un octet dit à l'autre : ça va, t'as l'air bit.",
  "Combien faut-il de développeurs pour changer une ampoule ? Aucun, c'est un problème matériel.",
  "Mon code ne marche pas, je ne sais pas pourquoi. Mon code marche, je ne sais pas pourquoi non plus.",
  "J'ai dit à mon PC que je voulais du réseau... il m'a dit qu'il était Wi-Fi de moi."
];

module.exports = {
  name: "joke",
  category: "fun",
  description: "Envoie une blague aléatoire",

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
    return replyText(sock, jid, `😂 ${joke}`, msg);
  }
};
