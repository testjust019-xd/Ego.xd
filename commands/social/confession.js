const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const fs = require('fs');
const path = require('path');
const LOG = path.join(__dirname, '../../data/confessionLog.json');

function logConfession(sender, text) {
  let arr = [];
  try { arr = JSON.parse(fs.readFileSync(LOG, 'utf-8')); } catch {}
  arr.push({ sender, text, at: Date.now() });
  if (arr.length > 200) arr = arr.slice(-200);
  fs.mkdirSync(path.dirname(LOG), { recursive: true });
  fs.writeFileSync(LOG, JSON.stringify(arr, null, 2));
}

module.exports = {
  name: 'confession',
  category: 'social',
  description: 'Confession anonyme modérée — .confession <texte>',

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const sender = getSenderJid(sock, msg);
    const text = args.join(' ').trim();
    if (!text) return replyText(sock, jid, 'Écris ta confession : `.confession ...`', msg);
    if (text.length > 500) return replyText(sock, jid, 'Max 500 caractères.', msg);
    logConfession(sender, text);
    return replyText(sock, jid,
      `🙈 *Confession anonyme*\n\n_${text}_\n\n_Traçable uniquement par l'owner (modération)._`,
      msg
    );
  }
};
