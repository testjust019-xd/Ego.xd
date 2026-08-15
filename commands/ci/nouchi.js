const { replyText } = require('../../helpers/reply');

const DICT = {
  'gaou': 'idiot, naïf',
  'enjailler': 's\'amuser, kiffer',
  'gbê': 'problème, embrouille',
  'farot': 'frimer, se la raconter',
  'boucant': 'ambiance, fête',
  'go': 'fille, copine',
  'gars': 'mec, pote',
  'dja': 'déjà',
  'wôrô': 'argent',
  'tchè': 'mon pote',
  'brouiller': 'embrouiller, compliquer',
  'côcô': 'menteur / blague',
  'mouiller': 'impliquer quelqu\'un',
  'senguer': 'ignorer',
  'kpakpato': 'rumeur, commérage',
  'atitou': 'tout de suite',
  'chap': 'manger',
  'djass': 'chance',
  'fongô': 'fatigué',
  'magouiller': 'tricher, combiner',
};

module.exports = {
  name: 'nouchi',
  category: 'ci',
  description: 'Dico nouchi ↔ français — .nouchi <mot>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mot = (args[0] || '').toLowerCase();
    if (!mot) {
      const keys = Object.keys(DICT).slice(0, 12).join(', ');
      return replyText(sock, jid, `🗣 *Nouchi*\nEx: \`.nouchi gaou\`\nMots : ${keys}…`, msg);
    }
    if (DICT[mot]) {
      return replyText(sock, jid, `🗣 *${mot}* → ${DICT[mot]}`, msg);
    }
    // reverse search
    const found = Object.entries(DICT).filter(([, v]) => v.includes(mot));
    if (found.length) {
      return replyText(sock, jid, found.map(([k, v]) => `*${k}* → ${v}`).join('\n'), msg);
    }
    return replyText(sock, jid, `Mot inconnu. Propose-le pour enrichir le dico !`, msg);
  }
};
