const fs = require('fs');
const path = require('path');
const { replyText } = require('../../helpers/reply');
const { isOwner } = require('../../lib/groupHelpers');

const LOG_PATH = path.join(__dirname, '..', '..', 'data', 'anonLog.json');

function loadLog() {
  try { return JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8')); } catch { return []; }
}

module.exports = {
  name: "anonlog",
  category: "general",
  description: "OWNER uniquement — voit qui a envoyé les derniers messages .anon",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    if (!isOwner(msg)) {
      return replyText(sock, jid, "Cette commande est réservée au owner.", msg);
    }

    const count = parseInt(args[0], 10) || 5;
    const log = loadLog();
    const recent = log.slice(-count);

    if (!recent.length) {
      return replyText(sock, jid, "Aucun message anonyme enregistré.", msg);
    }

    const text = recent.map((entry, i) => {
      const senderNumber = entry.senderJid.split('@')[0];
      return `${i + 1}. [${entry.timestamp}]\nDe : ${senderNumber}\nMessage : ${entry.message}`;
    }).join('\n\n');

    return replyText(sock, jid, `🔎 *Log anon (${recent.length} derniers)*\n\n${text}`, msg);
  }
};
