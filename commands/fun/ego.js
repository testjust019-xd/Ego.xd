const { replyTextDecor, playSfx } = require('../../helpers/reply');

const LINES = [
  { who: 'Gojo', text: 'Throughout Heaven and Earth, I alone am the honored one.' },
  { who: 'Gojo', text: 'Nah, I\'d win.' },
  { who: 'Jin-Woo', text: 'Arise.' },
  { who: 'Jin-Woo', text: 'I alone level up.' },
  { who: 'Jin-Woo', text: 'You cannot defeat me with that level of power.' },
  { who: 'Nagi', text: '…Too much effort.' },
  { who: 'Nagi', text: 'I just want to win without trying hard.' },
  { who: 'Isagi', text: 'My ego is the formula to become the best.' },
  { who: 'Barou', text: 'I am the king.' },
  { who: 'Triple Ego', text: 'Awaken or be forgotten.' },
  { who: 'System', text: 'Player has entered the Domain.' },
  { who: 'System', text: 'Quest complete. Rewards distributed.' }
];

module.exports = {
  name: 'ego',
  aliases: ['quoteego', 'tripleego'],
  category: 'fun',
  description: 'Citation aléatoire Triple Ego — .ego',

  async execute(sock, msg) {
    const jid = msg.key.remoteJid;
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    const theme =
      line.who.includes('Gojo') ? 'gojo' :
      line.who.includes('Jin') || line.who === 'System' ? 'jinwoo' : 'nagi';
    await playSfx(sock, jid, 'click', msg, 0.4);
    return replyTextDecor(
      sock, jid,
      `⚔️ *${line.who}*\n\n_「 ${line.text} 」_`,
      msg, null, 0.75, theme, 0.45
    );
  }
};
