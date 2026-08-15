const fs = require('fs');
const path = require('path');
const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');

const LOG_PATH = path.join(__dirname, '..', '..', 'data', 'anonLog.json');

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8')); } catch { return []; }
}
function saveLog(log) {
  fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

module.exports = {
  name: "anon",
  category: "social",
  description: "Envoie un message anonyme au groupe — .anon <message>",

  // NOTE : le message est envoyé SANS montrer qui l'a écrit dans le groupe,
  // MAIS l'expéditeur réel est gardé dans un log privé (data/anonLog.json),
  // consultable uniquement par le owner via .anonlog. Ça permet de garder
  // une trace en cas d'abus (harcèlement, insultes) tout en gardant
  // l'anonymat pour le reste du groupe.
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const text = args.join(' ');

    if (!text) {
      return replyText(sock, jid, "Écris un message, ex: .anon j'adore ce groupe", msg);
    }

    const log = loadLog();
    log.push({
      timestamp: new Date().toISOString(),
      jid,
      senderJid,
      message: text
    });
    if (log.length > 500) log.shift(); // limite la taille du fichier
    saveLog(log);

    return replyText(sock, jid, `🎭 *Message anonyme*\n\n${text}`, msg);
  }
};
