const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const {
  setSession, getSession, clearSession,
  setLastList, getLastList
} = require('../../lib/tempnumSessions');

const BASE_URL = 'https://receive-sms-online.info';
const UA = 'Mozilla/5.0';

async function fetchNumbersList() {
  const res = await fetch(BASE_URL, { headers: { 'User-Agent': UA } });
  const html = await res.text();

  // Les numéros apparaissent en liens du type href="46731299509-Sweden"
  const regex = /href="(\d{6,15})-([A-Za-z]+)"/g;
  const seen = new Set();
  const list = [];
  let m;
  while ((m = regex.exec(html)) !== null) {
    const phone = m[1];
    const country = m[2];
    if (seen.has(phone)) continue;
    seen.add(phone);
    list.push({ phone, country });
    if (list.length >= 10) break;
  }
  return list;
}

async function fetchMessages(phone) {
  const res = await fetch(
    `${BASE_URL}/get_sms_register.php?phone=${encodeURIComponent(phone)}`,
    { headers: { 'User-Agent': UA } }
  );
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

module.exports = {
  name: 'tempnum',
  category: 'tools',
  description: 'Numéro SMS temporaire PUBLIC — .tempnum / <n> / inbox / stop',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const sub = (args[0] || '').toLowerCase();

    const WARNING = '_⚠️ Numéro PUBLIC et partagé — n\'importe qui peut voir les SMS reçus dessus. À utiliser uniquement pour des inscriptions non sensibles (jamais pour un compte perso, banque, etc.)._';

    // ─── Inbox ───
    if (sub === 'inbox' || sub === 'boite') {
      const session = getSession(senderJid);
      if (!session) {
        return replyText(sock, jid, 'Aucun numéro actif. Tape `.tempnum` d\'abord.', msg);
      }
      try {
        const messages = await fetchMessages(session.phone);
        if (!messages.length) {
          return replyText(sock, jid,
            `📭 Aucun SMS reçu pour l'instant — \`+${session.phone}\`\n\nRéessaie dans une minute avec \`.tempnum inbox\`.`,
            msg
          );
        }
        let text = `📬 *SMS reçus* — \`+${session.phone}\`\n\n`;
        messages.slice(0, 10).forEach((m, i) => {
          const from = m.telefon || m.from || '?';
          const body = m.mesaj || m.message || '(vide)';
          const date = m.dt || m.date || '';
          text += `${i + 1}. De : ${from}\n   ${body}\n   _${date}_\n\n`;
        });
        return replyText(sock, jid, text.trim(), msg);
      } catch (err) {
        console.error('[tempnum inbox]', err);
        return replyText(sock, jid, 'Erreur lecture des SMS (site indisponible ou structure changée). Réessaie plus tard.', msg);
      }
    }

    // ─── Stop ───
    if (sub === 'stop' || sub === 'clear') {
      clearSession(senderJid);
      return replyText(sock, jid, '🗑️ Session tempnum effacée.', msg);
    }

    // ─── Choix d'un numéro par index (.tempnum 3) ───
    const asIndex = parseInt(sub, 10);
    if (!isNaN(asIndex) && asIndex >= 1) {
      const list = getLastList(senderJid);
      if (!list) {
        return replyText(sock, jid, 'Fais d\'abord `.tempnum` pour voir la liste des numéros.', msg);
      }
      const choice = list[asIndex - 1];
      if (!choice) {
        return replyText(sock, jid, 'Numéro invalide dans la liste.', msg);
      }
      setSession(senderJid, choice);
      return replyText(sock, jid,
        `📱 *Numéro sélectionné*\n\n\`+${choice.phone}\` (${choice.country})\n\n` +
        `• \`.tempnum inbox\` — voir les SMS reçus\n` +
        `• \`.tempnum stop\` — oublier\n\n${WARNING}`,
        msg
      );
    }

    // ─── Nouvelle liste de numéros ───
    try {
      await replyText(sock, jid, '📱 Récupération des numéros disponibles…', msg);
      const list = await fetchNumbersList();
      if (!list.length) {
        return replyText(sock, jid, 'Aucun numéro trouvé (site indisponible ou structure changée).', msg);
      }
      setLastList(senderJid, list);

      let text = `📱 *Numéros SMS temporaires publics*\n\n`;
      list.forEach((n, i) => {
        text += `${i + 1}. +${n.phone} (${n.country})\n`;
      });
      text += `\nChoisis-en un : \`.tempnum <n>\` (ex: \`.tempnum 1\`)\n\n${WARNING}`;
      return replyText(sock, jid, text, msg);
    } catch (err) {
      console.error('[tempnum]', err);
      return replyText(sock, jid, 'Impossible de récupérer les numéros (site hors ligne ou protection anti-bot activée). Réessaie plus tard.', msg);
    }
  }
};
