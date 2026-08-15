const { replyText } = require('../../helpers/reply');
const { getUser, updateUser } = require('../../lib/database');
const { getSenderJid } = require('../../lib/senderUtils');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

const QUESTIONS = [
  { q: "Quelle est la capitale de la Côte d'Ivoire ?", a: "yamoussoukro" },
  { q: "Combien de joueurs dans une équipe de foot sur le terrain ?", a: "11" },
  { q: "Quel est le plus grand océan du monde ?", a: "pacifique" },
  { q: "En quelle année a eu lieu la première Coupe du Monde ?", a: "1930" },
  { q: "Quelle planète est la plus proche du soleil ?", a: "mercure" }
];

const activeQuiz = new Map();

module.exports = {
  name: "trivia",
  category: "games",
  description: "Quiz de culture générale — .trivia pour une question, puis .trivia <réponse>",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    if (!args.length) {
      const question = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
      const { gameId, links } = createGameLink({
      chatJid: jid,
        type: 'answer',
        minRank: 'E',
        players: [{ jid: senderJid, role: 'p1' }],
        state: { title: 'Quiz', question: question.q, finished: false },
        onAction: async ({ action, data }) => {
          if (action !== 'answer') return { error: 'Action inconnue.' };
          const correctAns = activeQuiz.get(jid);
          if (!correctAns) return { error: 'Quiz terminé.' };
          const answer = String(data?.value || '').toLowerCase().trim();
          if (answer === correctAns) {
            activeQuiz.delete(jid);
            const user = getUser(senderJid);
            updateUser(senderJid, { xp: user.xp + 15 });
            updateGame(gameId, { finished: true, correct: true });
            return { ok: true };
          }
          return { error: 'Faux, réessaie !' };
        }
      });
      activeQuiz.set(jid, question.a);
      return replyText(sock, jid, `🧠 ${question.q}\nRéponds avec .trivia <ta réponse>\n🔗 Ou sur le navigateur : ${links.p1}`, msg);
    }

    if (!activeQuiz.has(jid)) {
      return replyText(sock, jid, "Lance d'abord .trivia pour avoir une question.", msg);
    }

    const answer = args.join(' ').toLowerCase().trim();
    const correct = activeQuiz.get(jid);

    if (answer === correct) {
      activeQuiz.delete(jid);
      const user = getUser(senderJid);
      updateUser(senderJid, { xp: user.xp + 15 });
      return replyText(sock, jid, "✅ Bonne réponse ! +15 XP", msg);
    }

    return replyText(sock, jid, "❌ Faux, réessaie !", msg);
  }
};
