const { replyText } = require('../../helpers/reply');

const MSGS = [
  'fix: ça marche sur ma machine',
  'feat: ajout du bouton qui sauve le monde',
  'chore: suppression du code que personne ne comprenait',
  'refactor: j\'ai tout cassé puis réparé',
  'docs: j\'ai menti dans le README',
  'style: espaces vs tabs — la guerre continue',
  'fix: le bug était une feature',
  'perf: maintenant c\'est lent pour une bonne raison',
  'test: on testera en prod',
  'feat: Solo Leveling mode activé',
];

module.exports = {
  name: 'commit',
  category: 'fun',
  description: 'Message de commit Git stylé — .commit',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const m = MSGS[Math.floor(Math.random() * MSGS.length)];
    return replyText(sock, jid, `💻 \`${m}\``, msg);
  }
};
