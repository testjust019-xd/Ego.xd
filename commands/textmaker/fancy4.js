const { replyText } = require('../../helpers/reply');
const { setSession, getSession, clearSession } = require('../../lib/fancy4Sessions');

// Différence avec .fancy2 : là-bas tu donnes le numéro ET le texte dans la
// même commande (.fancy2 6 Arise). Ici, comme .play2/.lyrics2, tu envoies
// d'abord le texte, ça te montre tous les styles numérotés, PUIS tu
// réponds juste avec le numéro dans les 60 secondes pour avoir CE style
// seul (pratique si tu veux comparer visuellement avant de choisir).
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

const SESSION_TTL_MS = 60000;

function toUnicodeFont(text, upperStart, lowerStart) {
  return [...text].map(ch => {
    const code = ch.codePointAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(upperStart + (code - 65));
    if (code >= 97 && code <= 122) return String.fromCodePoint(lowerStart + (code - 97));
    return ch;
  }).join('');
}

module.exports = {
  name: "fancy4",
  category: "textmaker",
  description: "Styles de texte en 2 temps — .fancy4 <texte>, puis .fancy4 <numero> (60s)",

  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;

    // ─── Cas 1 : sélection d'un style déjà affiché ───
    const maybeIndex = parseInt(args[0], 10);
    const session = getSession(jid);

    if (session && args.length === 1 && !isNaN(maybeIndex)) {
      const choice = session.results[maybeIndex - 1];

      if (!choice) {
        return replyText(sock, jid, `Choisis un numéro entre 1 et ${session.results.length}.`, msg);
      }

      clearSession(jid);
      return replyText(sock, jid, choice.rendered, msg);
    }

    // ─── Cas 2 : nouveau texte à styliser ───
    const text = args.join(' ');
    if (!text) {
      return replyText(sock, jid, "Écris un texte, ex: .fancy4 Arise", msg);
    }

    const results = STYLES.map(([name, upper, lower]) => ({
      name,
      rendered: toUnicodeFont(text, upper, lower)
    }));

    setSession(jid, results, SESSION_TTL_MS);

    const list = results.map((r, i) => `${i + 1}. ${r.rendered}`).join('\n');
    return replyText(sock, jid, `${list}\n\nRéponds avec .fancy4 <numero> dans les 60 secondes pour avoir ce style seul.`, msg);
  }
};
