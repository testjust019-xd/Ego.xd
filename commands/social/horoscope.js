const { replyText } = require('../../helpers/reply');

const SIGNS = {
  belier: 'Bélier', taureau: 'Taureau', gemeaux: 'Gémeaux', cancer: 'Cancer',
  lion: 'Lion', vierge: 'Vierge', balance: 'Balance', scorpion: 'Scorpion',
  sagittaire: 'Sagittaire', capricorne: 'Capricorne', verseau: 'Verseau', poissons: 'Poissons'
};

const LINES = [
  'Une opportunité se présente — reste attentif.',
  'Énergie haute : avance sur tes projets.',
  'Journée calme, idéale pour planifier.',
  'Un message inattendu pourrait changer ta soirée.',
  'Fais confiance à ton instinct aujourd\'hui.',
  'Attention aux dépenses impulsives.',
  'Belle harmonie côté relations.',
  'Challenge sportif ou mental bienvenu.',
];

module.exports = {
  name: 'horoscope',
  category: 'social',
  description: 'Horoscope du jour — .horoscope <signe>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const s = (args[0] || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!s || !SIGNS[s]) {
      return replyText(sock, jid,
        'Signes : ' + Object.keys(SIGNS).join(', ') + '\nEx: `.horoscope lion`',
        msg
      );
    }
    const line = LINES[Math.floor(Math.random() * LINES.length)];
    const love = 1 + Math.floor(Math.random() * 5);
    const work = 1 + Math.floor(Math.random() * 5);
    const luck = 1 + Math.floor(Math.random() * 5);
    return replyText(sock, jid,
      `✨ *Horoscope — ${SIGNS[s]}*\n\n${line}\n\n❤️ Amour ${'★'.repeat(love)}${'☆'.repeat(5 - love)}\n` +
      `💼 Travail ${'★'.repeat(work)}${'☆'.repeat(5 - work)}\n🍀 Chance ${'★'.repeat(luck)}${'☆'.repeat(5 - luck)}`,
      msg
    );
  }
};
