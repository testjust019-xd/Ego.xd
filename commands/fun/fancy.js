const { replyText } = require('../../helpers/reply');

// Blocs Unicode "Mathematical Alphanumeric" — contigus, donc convertibles
// simplement par décalage de code point (pas de trous dans ces plages).
const STYLES = {
  "𝗚𝗿𝗮𝘀": { upper: 0x1D5D4, lower: 0x1D5EE },     // Sans-serif Bold
  "𝘐𝘵𝘢𝘭𝘪𝘲𝘶𝘦": { upper: 0x1D608, lower: 0x1D622 }, // Sans-serif Italic
  "𝙼𝚘𝚗𝚘": { upper: 0x1D670, lower: 0x1D68A },      // Monospace
  "𝔤𝔬𝔱𝔥𝔦𝔮𝔲𝔢": { upper: 0x1D504, lower: 0x1D51E }  // Fraktur
};

function toUnicodeFont(text, upperStart, lowerStart) {
  return [...text].map(ch => {
    const code = ch.codePointAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(upperStart + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(lowerStart + (code - 97));
    return ch; // chiffres/ponctuation laissés tels quels
  }).join('');
}

module.exports = {
  name: "fancy",
  category: "fun",
  description: "Style ton texte en plusieurs polices — .fancy <texte>",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return replyText(sock, jid, "Écris un texte, ex: .fancy Hello", msg);
    }

    let output = "";
    for (const [styleName, style] of Object.entries(STYLES)) {
      output += `${styleName} : ${toUnicodeFont(text, style.upper, style.lower)}\n`;
    }

    return replyText(sock, jid, output, msg);
  }
};
