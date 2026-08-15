const { replyText } = require('../../helpers/reply');

/** Détection basique opérateur / pays (Afrique de l'Ouest focus) — sans API payante */
function analyzeNumber(raw) {
  const digits = String(raw).replace(/\D/g, '');
  let info = { digits, country: null, operator: null, format: null, valid: false };

  // Côte d'Ivoire
  if (digits.startsWith('225') && digits.length >= 13) {
    info.country = 'Côte d\'Ivoire 🇨🇮';
    info.format = `+${digits.slice(0, 3)} ${digits.slice(3)}`;
    info.valid = digits.length === 13 || digits.length === 14;
    const local = digits.slice(3);
    const pref = local.slice(0, 2);
    const map = {
      '07': 'Orange CI', '17': 'Orange CI', '27': 'Orange CI', '37': 'Orange CI', '47': 'Orange CI', '57': 'Orange CI', '67': 'Orange CI', '77': 'Orange CI', '87': 'Orange CI', '97': 'Orange CI',
      '05': 'MTN CI', '15': 'MTN CI', '25': 'MTN CI', '35': 'MTN CI', '45': 'MTN CI', '55': 'MTN CI', '65': 'MTN CI', '75': 'MTN CI', '85': 'MTN CI', '95': 'MTN CI',
      '01': 'Moov CI', '11': 'Moov CI', '21': 'Moov CI', '31': 'Moov CI', '41': 'Moov CI', '51': 'Moov CI', '61': 'Moov CI', '71': 'Moov CI', '81': 'Moov CI', '91': 'Moov CI',
      '03': 'Moov CI', '04': 'MTN CI', '06': 'Orange CI', '08': 'Orange CI', '09': 'Orange CI'
    };
    // nouveaux préfixes 01/05/07 (10 chiffres locaux)
    if (local.length >= 10) {
      const p2 = local.slice(0, 2);
      if (['01', '05', '07'].includes(p2)) {
        info.operator = p2 === '01' ? 'Moov CI' : p2 === '05' ? 'MTN CI' : 'Orange CI';
      } else {
        info.operator = map[pref] || 'Inconnu / fixe ?';
      }
    }
  } else if (digits.startsWith('221') && digits.length >= 12) {
    info.country = 'Sénégal 🇸🇳';
    info.format = `+${digits}`;
    info.valid = true;
    const p = digits.slice(3, 5);
    info.operator = { '77': 'Orange SN', '78': 'Orange SN', '76': 'Free SN', '70': 'Expresso', '75': 'Promobile' }[p] || 'Sénégal';
  } else if (digits.startsWith('226')) {
    info.country = 'Burkina Faso 🇧🇫';
    info.format = `+${digits}`;
    info.valid = digits.length >= 11;
  } else if (digits.startsWith('223')) {
    info.country = 'Mali 🇲🇱';
    info.format = `+${digits}`;
    info.valid = digits.length >= 11;
  } else if (digits.startsWith('228')) {
    info.country = 'Togo 🇹🇬';
    info.format = `+${digits}`;
    info.valid = true;
  } else if (digits.startsWith('229')) {
    info.country = 'Bénin 🇧🇯';
    info.format = `+${digits}`;
    info.valid = true;
  } else if (digits.startsWith('33')) {
    info.country = 'France 🇫🇷';
    info.format = `+${digits}`;
    info.valid = digits.length >= 11;
    info.operator = 'France (mobile/fixe)';
  } else if (digits.length >= 10) {
    info.country = 'Inconnu / international';
    info.format = `+${digits}`;
    info.valid = true;
  }

  return info;
}

module.exports = {
  name: 'checknum',
  category: 'tools',
  description: 'Infos basiques d\'un numéro — .checknum 22507…',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    let raw = args[0];
    if (!raw) {
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      raw = ctx?.participant || ctx?.mentionedJid?.[0] || '';
      raw = String(raw).replace(/@.*$/, '');
    }
    if (!raw) {
      return replyText(sock, jid,
        '📞 *Check numéro*\n\n`.checknum 2250700000000`\nOu mentionne / réponds à quelqu\'un.',
        msg
      );
    }

    const info = analyzeNumber(raw);
    if (!info.digits || info.digits.length < 8) {
      return replyText(sock, jid, 'Numéro trop court / invalide.', msg);
    }

    let text = `📞 *Analyse numéro*\n\n`;
    text += `🔢 ${info.format || info.digits}\n`;
    if (info.country) text += `🌍 ${info.country}\n`;
    if (info.operator) text += `📡 ${info.operator}\n`;
    text += `✅ Format : ${info.valid ? 'plausible' : 'douteux'}\n`;
    text += `\n_Info indicative locale — pas une base opérateur live._`;
    return replyText(sock, jid, text, msg);
  }
};
