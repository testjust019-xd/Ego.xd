const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const sessions = require('../../lib/gameSessions');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

const WORDS = [
  'OMBRE','PORTE','RANG','MANA','CHASSE','ARISE','SYSTEME','ROI','DAGUE','ARMEE',
  'NIGHT','GHOST','BLADE','POWER','LEVEL','QUEST','BOSS','LOOT','SKILL','RANK'
];

function feedback(secret, guess) {
  const s = secret.toUpperCase();
  const g = guess.toUpperCase();
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (g[i] === s[i]) out += '🟩';
    else if (s.includes(g[i])) out += '🟨';
    else out += '⬛';
  }
  return out;
}

module.exports = {
  name: 'motmystere',
  category: 'games',
  description: 'Devine le mot (Wordle FR) — .motmystere [mot]',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const k = sessions.key(jid, 'motmystere');
    let s = sessions.get(k);
    const guess = (args[0] || '').toUpperCase().replace(/[^A-Z]/g, '');

    function pushWeb() {
      updateGame(s.gameId, {
        question: `Mot de ${s.word.length} lettres — essai ${s.tries.length}/${s.max}`,
        log: s.tries
      });
    }

    if (!s || args[0] === 'new') {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      s = { word, tries: [], max: 6 };
      const { gameId, links } = createGameLink({
      chatJid: jid,
        type: 'answer',
        minRank: 'E',
        players: [{ jid: sender, role: 'p1' }],
        state: { title: 'Mot mystère', question: `Mot de ${word.length} lettres — 6 essais`, finished: false },
        onAction: async ({ action, data }) => {
          if (action !== 'answer') return { error: 'Action inconnue.' };
          const cur = sessions.get(k);
          if (!cur) return { error: 'Partie terminée.' };
          const g2 = String(data?.value || '').toUpperCase().replace(/[^A-Z]/g, '');
          if (!g2 || g2.length !== cur.word.length) return { error: `Le mot fait ${cur.word.length} lettres.` };
          const fb = feedback(cur.word, g2);
          cur.tries.push(`${g2} ${fb}`);
          sessions.set(k, cur, 20 * 60 * 1000);
          s = cur;
          const won = g2 === cur.word;
          const lost = cur.tries.length >= cur.max;
          if (won || lost) {
            updateGame(cur.gameId, { finished: true, correct: won, answer: cur.word, log: cur.tries });
            sessions.del(k);
          } else {
            pushWeb();
          }
          return { ok: true };
        }
      });
      s.gameId = gameId;
      sessions.set(k, s, 20 * 60 * 1000);
      return replyText(sock, jid,
        `🧩 *MOT MYSTÈRE*\nMot de *${word.length}* lettres\n6 essais\n\n\`.motmystere <mot>\`\n🔗 Ou sur le navigateur : ${links.p1}`,
        msg
      );
    }

    if (!guess || guess.length !== s.word.length) {
      return replyText(sock, jid, `Le mot a ${s.word.length} lettres. Essais : ${s.tries.length}/${s.max}`, msg);
    }

    const fb = feedback(s.word, guess);
    s.tries.push(`${guess} ${fb}`);
    sessions.set(k, s, 20 * 60 * 1000);

    if (guess === s.word) {
      updateGame(s.gameId, { finished: true, correct: true, answer: s.word, log: s.tries });
      sessions.del(k);
      return replyText(sock, jid, `🎉 Bravo ! *${s.word}*\n\n${s.tries.join('\n')}`, msg);
    }
    if (s.tries.length >= s.max) {
      updateGame(s.gameId, { finished: true, correct: false, answer: s.word, log: s.tries });
      sessions.del(k);
      return replyText(sock, jid, `💀 Perdu. Mot : *${s.word}*\n\n${s.tries.join('\n')}`, msg);
    }
    pushWeb();
    return replyText(sock, jid, `🧩 Essai ${s.tries.length}/${s.max}\n\n${s.tries.join('\n')}`, msg);
  }
};
