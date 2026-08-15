const { replyText } = require('../../helpers/reply');

const FLIP_MAP = {
  a:'ɐ', b:'q', c:'ɔ', d:'p', e:'ǝ', f:'ɟ', g:'ƃ', h:'ɥ', i:'ᴉ', j:'ɾ',
  k:'ʞ', l:'l', m:'ɯ', n:'u', o:'o', p:'d', q:'b', r:'ɹ', s:'s', t:'ʇ',
  u:'n', v:'ʌ', w:'ʍ', x:'x', y:'ʎ', z:'z',
  '0':'0', '1':'Ɩ', '2':'ᄅ', '3':'Ɛ', '4':'ㄣ', '5':'ϛ', '6':'9', '7':'ㄥ', '8':'8', '9':'6',
  '.':'˙', ',':"'", "'":',', '?':'¿', '!':'¡'
};

function flipText(text) {
  return [...text.toLowerCase()].reverse().map(ch => FLIP_MAP[ch] || ch).join('');
}

function mockingCase(text) {
  return [...text].map((ch, i) => i % 2 === 0 ? ch.toLowerCase() : ch.toUpperCase()).join('');
}

function strikethrough(text) {
  return [...text].map(ch => ch + '\u0336').join('');
}

function underline(text) {
  return [...text].map(ch => ch + '\u0332').join('');
}

function vaporwave(text) {
  return [...text].map(ch => {
    const code = ch.codePointAt(0);
    if (code >= 33 && code <= 126) return String.fromCodePoint(code - 33 + 0xFF01);
    if (ch === ' ') return '　';
    return ch;
  }).join('');
}

module.exports = {
  name: "fancy3",
  category: "textmaker",
  description: "Transforme ton texte (envers, mocking, barré...) — .fancy3 <texte>",

  // Différent de .fancy/.fancy2 : ceux-là changent la POLICE (des lettres
  // Unicode différentes), .fancy3 change la STRUCTURE du texte.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return replyText(sock, jid, "Écris un texte, ex: .fancy3 Arise", msg);
    }

    const output = [
      `🙃 Envers : ${flipText(text)}`,
      `🐫 mOcKiNg : ${mockingCase(text)}`,
      `～ Barré : ${strikethrough(text)}`,
      `＿ Souligné : ${underline(text)}`,
      `🌌 Vaporwave : ${vaporwave(text)}`
    ].join('\n\n');

    return replyText(sock, jid, output, msg);
  }
};
