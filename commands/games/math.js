const { replyText } = require('../../helpers/reply');
const { getUser, updateUser } = require('../../lib/database');
const { getSenderJid } = require('../../lib/senderUtils');

function generateProblem() {
  const a = Math.floor(Math.random() * 50) + 1;
  const b = Math.floor(Math.random() * 50) + 1;
  const ops = ['+', '-', '*'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let answer;
  if (op === '+') answer = a + b;
  else if (op === '-') answer = a - b;
  else answer = a * b;
  return { text: `${a} ${op} ${b}`, answer };
}

const activeProblems = new Map();

module.exports = {
  name: "math",
  category: "games",
  description: "Calcul mental — .math pour une question, puis réponds avec .math <réponse>",

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);

    if (!args.length) {
      const problem = generateProblem();
      activeProblems.set(jid, problem.answer);
      return replyText(sock, jid, `🧮 Combien font : *${problem.text}* ?\nRéponds avec .math <ta réponse>`, msg);
    }

    if (!activeProblems.has(jid)) {
      return replyText(sock, jid, "Lance d'abord .math pour avoir une question.", msg);
    }

    const userAnswer = parseInt(args[0], 10);
    const correctAnswer = activeProblems.get(jid);

    if (userAnswer === correctAnswer) {
      activeProblems.delete(jid);
      const user = getUser(senderJid);
      updateUser(senderJid, { xp: user.xp + 10 });
      return replyText(sock, jid, "✅ Correct ! +10 XP", msg);
    }

    return replyText(sock, jid, "❌ Faux, réessaie !", msg);
  }
};
