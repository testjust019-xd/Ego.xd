const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const sessions = require('../../lib/gameSessions');
const { createGameLink, updateGame } = require('../../helpers/gameWeb');

const WORDS = [
  'shadow','monarch','hunter','dungeon','arise','system','gate','rank',
  'abidjan','nouchi','football','mimosas','elegance','baobab','harmattan',
  'javascript','whatsapp','sololeveling','chimere','mana'
];

function render(word, guessed) {
  return word.split('').map(c => guessed.has(c) ? c : '_').join(' ');
}

module.exports = {
  name: 'pendu',
  category: 'games',
  description: 'Jeu du pendu — .pendu [lettre]',

  minRank: 'E',
  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const k = sessions.key(jid, 'pendu');
    let s = sessions.get(k);
    const letter = (args[0] || '').toLowerCase().replace(/[^a-zàâäéèêëïîôùûüç]/gi, '');

    const pushWeb = (finished, won) => updateGame(s.gameId, {
      masked: render(s.word, new Set(s.guessed)).replace(/ /g, ''),
      triesLeft: s.max - s.fails,
      guessed: s.guessed,
      finished: !!finished,
      won: !!won,
      word: finished ? s.word : undefined
    });

    function makeLink() {
      const { gameId, links } = createGameLink({
      chatJid: jid,
        type: 'hangman',
        minRank: 'E',
        players: [{ jid: sender, role: 'p1' }],
        state: { masked: render(s.word, new Set()).replace(/ /g, ''), triesLeft: s.max, guessed: [], finished: false },
        onAction: async ({ action, data }) => {
          if (action !== 'letter') return { error: 'Action inconnue.' };
          const cur = sessions.get(k);
          if (!cur) return { error: 'Partie terminée.' };
          const l = String(data?.value || '').toLowerCase();
          if (!l || l.length !== 1 || cur.guessed.includes(l)) return { error: 'Lettre invalide ou déjà jouée.' };
          cur.guessed.push(l);
          if (!cur.word.includes(l)) cur.fails++;
          const set = new Set(cur.guessed);
          const won2 = cur.word.split('').every(c => set.has(c));
          const lost2 = cur.fails >= cur.max;
          sessions.set(k, cur, 15 * 60 * 1000);
          s = cur;
          pushWeb(won2 || lost2, won2);
          if (won2 || lost2) sessions.del(k);
          return { ok: true };
        }
      });
      return { gameId, links };
    }

    if (!s || args[0] === 'new' || args[0] === 'nouveau') {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      s = { word, guessed: [], fails: 0, max: 6 };
      const { gameId, links } = makeLink();
      s.gameId = gameId;
      sessions.set(k, s, 15 * 60 * 1000);
      return replyText(sock, jid,
        `🎮 *PENDU*\n\n${render(word, new Set())}\n\nVies : 6\nTape \`.pendu <lettre>\`\n🔗 Joue sur le navigateur : ${links.p1}`,
        msg
      );
    }

    if (!letter || letter.length !== 1) {
      return replyText(sock, jid, `Mot : ${render(s.word, new Set(s.guessed))}\nVies : ${s.max - s.fails}\n\`.pendu <lettre>\``, msg);
    }

    if (s.guessed.includes(letter)) {
      return replyText(sock, jid, `Déjà essayé : ${letter}`, msg);
    }
    s.guessed.push(letter);
    if (!s.word.includes(letter)) s.fails++;

    const set = new Set(s.guessed);
    const board = render(s.word, set);
    const won = s.word.split('').every(c => set.has(c));
    sessions.set(k, s, 15 * 60 * 1000);

    if (won) {
      pushWeb(true, true);
      sessions.del(k);
      return replyText(sock, jid, `🎉 Gagné ! Le mot était *${s.word}*\n${board}`, msg);
    }
    if (s.fails >= s.max) {
      pushWeb(true, false);
      sessions.del(k);
      return replyText(sock, jid, `💀 Perdu… Le mot était *${s.word}*`, msg);
    }
    pushWeb(false, false);
    return replyText(sock, jid,
      `🎮 *PENDU*\n\n${board}\nVies : ${s.max - s.fails}\nEssais : ${s.guessed.join(', ')}`,
      msg
    );
  }
};
