const { replyText } = require('../../helpers/reply');

// Styles "spéciaux" (pas seulement bold unicode)
const SMALL_CAPS = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',
  n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
};
const BUBBLE = {
  a:'ⓐ',b:'ⓑ',c:'ⓒ',d:'ⓓ',e:'ⓔ',f:'ⓕ',g:'ⓖ',h:'ⓗ',i:'ⓘ',j:'ⓙ',k:'ⓚ',l:'ⓛ',m:'ⓜ',
  n:'ⓝ',o:'ⓞ',p:'ⓟ',q:'ⓠ',r:'ⓡ',s:'ⓢ',t:'ⓣ',u:'ⓤ',v:'ⓥ',w:'ⓦ',x:'ⓧ',y:'ⓨ',z:'ⓩ',
  A:'Ⓐ',B:'Ⓑ',C:'Ⓒ',D:'Ⓓ',E:'Ⓔ',F:'Ⓕ',G:'Ⓖ',H:'Ⓗ',I:'Ⓘ',J:'Ⓙ',K:'Ⓚ',L:'Ⓛ',M:'Ⓜ',
  N:'Ⓝ',O:'Ⓞ',P:'Ⓟ',Q:'Ⓠ',R:'Ⓡ',S:'Ⓢ',T:'Ⓣ',U:'Ⓤ',V:'Ⓥ',W:'Ⓦ',X:'Ⓧ',Y:'Ⓨ',Z:'Ⓩ',
  '0':'⓪','1':'①','2':'②','3':'③','4':'④','5':'⑤','6':'⑥','7':'⑦','8':'⑧','9':'⑨'
};
const SQUARE = {
  a:'🅰',b:'🅱',c:'🅲',d:'🅳',e:'🅴',f:'🅵',g:'🅶',h:'🅷',i:'🅸',j:'🅹',k:'🅺',l:'🅻',m:'🅼',
  n:'🅽',o:'🅾',p:'🅿',q:'🆀',r:'🆁',s:'🆂',t:'🆃',u:'🆄',v:'🆅',w:'🆆',x:'🆇',y:'🆈',z:'🆉'
};

function mapChars(text, table) {
  return [...text].map(ch => table[ch] || table[ch.toLowerCase()] || ch).join('');
}
function spaced(text) {
  return [...text].join(' ');
}
function doubleStruck(text) {
  return [...text].map(ch => {
    const c = ch.codePointAt(0);
    if (c >= 65 && c <= 90) return String.fromCodePoint(0x1D538 + (c - 65));
    if (c >= 97 && c <= 122) return String.fromCodePoint(0x1D552 + (c - 97));
    if (c >= 48 && c <= 57) return String.fromCodePoint(0x1D7D8 + (c - 48));
    return ch;
  }).join('');
}
function wavy(text) {
  return [...text].map(ch => ch + '\u0303').join('');
}
function strike(text) {
  return [...text].map(ch => ch + '\u0336').join('');
}
function underline(text) {
  return [...text].map(ch => ch + '\u0332').join('');
}
function mirror(text) {
  const m = {'a':'ɒ','b':'d','c':'ɔ','d':'b','e':'ɘ','f':'ʇ','g':'ǫ','h':'ɥ','i':'ᴉ','j':'ſ','k':'ʞ','l':'l','m':'ɯ','n':'u','o':'o','p':'q','q':'p','r':'ɹ','s':'s','t':'ʇ','u':'n','v':'ʌ','w':'ʍ','x':'x','y':'ʎ','z':'z'};
  return [...text].reverse().map(ch => m[ch.toLowerCase()] || ch).join('');
}

const STYLES = [
  ['Small Caps', t => mapChars(t.toLowerCase(), SMALL_CAPS)],
  ['Bulles', t => mapChars(t, BUBBLE)],
  ['Carrés', t => mapChars(t.toLowerCase(), SQUARE)],
  ['Double Struck', doubleStruck],
  ['Espacé', spaced],
  ['Vague', wavy],
  ['Barré', strike],
  ['Souligné', underline],
  ['Miroir', mirror],
  ['👏 Clap', t => [...t].join(' 👏 ')],
  ['🔥 Fire', t => `🔥 ${[...t].join(' ')} 🔥`],
  ['「」 Japon', t => `「${t}」`]
];

module.exports = {
  name: 'fancy5',
  category: 'textmaker',
  description: 'Styles spéciaux (bulles, small caps…) — .fancy5 <texte> ou .fancy5 <n> <texte>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    if (!args.length) {
      const list = STYLES.map(([name], i) => `${i + 1}. ${name}`).join('\n');
      return replyText(sock, jid,
        `Utilise :\n.fancy5 <texte> → tous\n.fancy5 <numero> <texte> → un style\n\n${list}`,
        msg
      );
    }

    const idx = parseInt(args[0], 10) - 1;
    if (idx >= 0 && idx < STYLES.length && args.length > 1) {
      const text = args.slice(1).join(' ');
      return replyText(sock, jid, STYLES[idx][1](text), msg);
    }

    const text = args.join(' ');
    const out = STYLES.map(([name, fn]) => `*${name}*\n${fn(text)}`).join('\n\n');
    return replyText(sock, jid, out, msg);
  }
};
