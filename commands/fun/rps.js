const { replyText } = require('../../helpers/reply');

const CHOICES = ["pierre", "feuille", "ciseaux"];

function decideWinner(user, bot) {
  if (user === bot) return "égalité";
  const wins = { pierre: "ciseaux", feuille: "pierre", ciseaux: "feuille" };
  return wins[user] === bot ? "gagné" : "perdu";
}

module.exports = {
  name: "rps",
  category: "fun",
  description: "Pierre-feuille-ciseaux — .rps pierre/feuille/ciseaux",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const userChoice = args[0]?.toLowerCase();

    if (!CHOICES.includes(userChoice)) {
      return replyText(sock, jid, "Choisis : .rps pierre, .rps feuille ou .rps ciseaux", msg);
    }

    const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
    const outcome = decideWinner(userChoice, botChoice);
    const outcomeText = outcome === "égalité" ? "Égalité 🤝" : outcome === "gagné" ? "Tu as gagné 🎉" : "Tu as perdu 😅";

    return replyText(sock, jid, `Toi : ${userChoice}\nMoi : ${botChoice}\n\n${outcomeText}`, msg);
  }
};
