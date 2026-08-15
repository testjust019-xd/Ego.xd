const { replyText } = require('../../helpers/reply');

// Amélioration vs .fancy :
// - 11 styles au lieu de 4 (tous des blocs Unicode contigus SANS trous —
//   contrairement au Fraktur normal utilisé dans .fancy qui a des lettres
//   manquantes pour C/H/I/R/Z, ici Fraktur Gras n'a aucun trou)
// - possibilité de choisir un seul style par numéro (pratique pour copier-
//   coller direct, ex: dans ton nom WhatsApp) au lieu d'avoir tout d'un coup
const STYLES = [
  ["Gras",               0x1D400, 0x1D41A],
  ["Gras Italique",      0x1D468, 0x1D482],
  ["Script Gras",        0x1D4D0, 0x1D4EA],
  ["Gothique Gras",      0x1D56C, 0x1D586],
  ["Sans",               0x1D5A0, 0x1D5BA],
  ["Sans Gras",          0x1D5D4, 0x1D5EE],
  ["Sans Italique",      0x1D608, 0x1D622],
  ["Sans Gras Italique", 0x1D63C, 0x1D656],
  ["Mono",               0x1D670, 0x1D68A],
  ["Encerclé",           0x24B6,  0x24D0],
  ["Pleine Largeur",     0xFF21,  0xFF41]
];

function toUnicodeFont(text, upperStart, lowerStart) {
  return [...text].map(ch => {
    const code = ch.codePointAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(upperStart + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(lowerStart + (code - 97));
    return ch;
  }).join('');
}

module.exports = {
  name: "fancy2",
  category: "textmaker",
  description: "Version améliorée de .fancy (11 styles) — .fancy2 <texte> ou .fancy2 <numero> <texte>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!args.length) {
      const list = STYLES.map(([name], i) => `${i + 1}. ${name}`).join('\n');
      return replyText(sock, jid, `Utilise :\n.fancy2 <texte> → tous les styles\n.fancy2 <numero> <texte> → un seul style\n\n${list}`, msg);
    }

    const styleIndex = parseInt(args[0], 10) - 1;
    const isValidChoice = styleIndex >= 0 && styleIndex < STYLES.length && args.length > 1;

    if (isValidChoice) {
      const [, upper, lower] = STYLES[styleIndex];
      const text = args.slice(1).join(' ');
      return replyText(sock, jid, toUnicodeFont(text, upper, lower), msg);
    }

    // Sinon : premier argument n'est pas un numéro valide -> traite tout comme du texte
    const text = args.join(' ');
    const output = STYLES.map(([name, upper, lower]) => `${name} : ${toUnicodeFont(text, upper, lower)}`).join('\n');
    return replyText(sock, jid, output, msg);
  }
};
