const { replyText } = require('../../helpers/reply');
const { getSenderJid } = require('../../lib/senderUtils');
const { setSession, getSession, clearSession } = require('../../lib/tempmailSessions');

async function create1secmail() {
  const res = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1');
  const list = await res.json();
  const email = list?.[0];
  if (!email) throw new Error('1secmail empty');
  const [login, domain] = email.split('@');
  return { email, login, domain, provider: '1secmail' };
}

async function inbox1secmail(login, domain) {
  const res = await fetch(
    `https://www.1secmail.com/api/v1/?action=getMessages&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}`
  );
  return await res.json();
}

async function read1secmail(login, domain, id) {
  const res = await fetch(
    `https://www.1secmail.com/api/v1/?action=readMessage&login=${encodeURIComponent(login)}&domain=${encodeURIComponent(domain)}&id=${id}`
  );
  return await res.json();
}

async function createMailTm() {
  const domRes = await fetch('https://api.mail.tm/domains');
  const domData = await domRes.json();
  const domain = domData['hydra:member']?.[0]?.domain;
  if (!domain) throw new Error('mail.tm domains');
  const login = `arise${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`;
  const address = `${login}@${domain}`;
  const password = `Arise${Math.random().toString(36).slice(2)}9!`;
  const accRes = await fetch('https://api.mail.tm/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password })
  });
  if (!accRes.ok) throw new Error('mail.tm account');
  const tokRes = await fetch('https://api.mail.tm/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, password })
  });
  const tokData = await tokRes.json();
  if (!tokData.token) throw new Error('mail.tm token');
  return { email: address, token: tokData.token, provider: 'mail.tm' };
}

async function inboxMailTm(token) {
  const res = await fetch('https://api.mail.tm/messages', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data['hydra:member'] || [];
}

async function readMailTm(token, id) {
  const res = await fetch(`https://api.mail.tm/messages/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return await res.json();
}

module.exports = {
  name: 'tempmail',
  category: 'tools',
  description: 'Email temporaire — .tempmail / inbox / lire <n>',

  dailyLimit: true,
  async execute(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const senderJid = getSenderJid(sock, msg);
    const sub = (args[0] || '').toLowerCase();

    // ─── Inbox ───
    if (sub === 'inbox' || sub === 'mails' || sub === 'boite') {
      const session = getSession(senderJid);
      if (!session) {
        return replyText(sock, jid, 'Aucune adresse active. Tape `.tempmail` d\'abord.', msg);
      }
      try {
        let list = [];
        if (session.provider === '1secmail') {
          list = await inbox1secmail(session.login, session.domain);
          if (!list?.length) {
            return replyText(sock, jid, `📭 Boîte vide — \`${session.email}\``, msg);
          }
          let text = `📬 *Inbox* — \`${session.email}\`\n\n`;
          list.slice(0, 10).forEach((m, i) => {
            text += `${i + 1}. *${m.subject || '(sans objet)'}*\n   De: ${m.from}\n`;
          });
          text += `\nLire : \`.tempmail lire <n>\``;
          return replyText(sock, jid, text, msg);
        }
        // mail.tm
        list = await inboxMailTm(session.token);
        if (!list.length) {
          return replyText(sock, jid, `📭 Boîte vide — \`${session.email}\``, msg);
        }
        let text = `📬 *Inbox* — \`${session.email}\`\n\n`;
        list.slice(0, 10).forEach((m, i) => {
          text += `${i + 1}. *${m.subject || '(sans objet)'}*\n   De: ${m.from?.address || m.from}\n`;
        });
        text += `\nLire : \`.tempmail lire <n>\``;
        // store ids for read
        session._ids = list.map(m => m.id);
        setSession(senderJid, session);
        return replyText(sock, jid, text, msg);
      } catch (err) {
        console.error('[tempmail inbox]', err);
        return replyText(sock, jid, 'Erreur lecture inbox (API indisponible).', msg);
      }
    }

    // ─── Lire ───
    if (sub === 'lire' || sub === 'read') {
      const session = getSession(senderJid);
      if (!session) {
        return replyText(sock, jid, 'Aucune adresse active. `.tempmail` d\'abord.', msg);
      }
      const n = parseInt(args[1], 10);
      if (!n || n < 1) {
        return replyText(sock, jid, 'Ex: `.tempmail lire 1`', msg);
      }
      try {
        if (session.provider === '1secmail') {
          const list = await inbox1secmail(session.login, session.domain);
          const m = list?.[n - 1];
          if (!m) return replyText(sock, jid, 'Mail introuvable.', msg);
          const full = await read1secmail(session.login, session.domain, m.id);
          const body = (full.textBody || full.body || '').slice(0, 2500);
          return replyText(sock, jid,
            `📧 *${full.subject || m.subject}*\nDe: ${full.from || m.from}\n\n${body || '(vide)'}`,
            msg
          );
        }
        const list = await inboxMailTm(session.token);
        const m = list[n - 1];
        if (!m) return replyText(sock, jid, 'Mail introuvable.', msg);
        const full = await readMailTm(session.token, m.id);
        const body = (full.text || full.intro || '').slice(0, 2500);
        return replyText(sock, jid,
          `📧 *${full.subject || m.subject}*\nDe: ${full.from?.address || '?'}\n\n${body || '(vide)'}`,
          msg
        );
      } catch (err) {
        console.error('[tempmail lire]', err);
        return replyText(sock, jid, 'Erreur lecture mail.', msg);
      }
    }

    if (sub === 'stop' || sub === 'clear') {
      clearSession(senderJid);
      return replyText(sock, jid, '🗑️ Session tempmail effacée.', msg);
    }

    // ─── Nouvelle adresse ───
    try {
      await replyText(sock, jid, '📨 Génération d\'une adresse…', msg);
      let data;
      try {
        data = await create1secmail();
      } catch {
        data = await createMailTm();
      }
      setSession(senderJid, data, 60 * 60 * 1000);
      return replyText(sock, jid,
        `📨 *Email temporaire*\n\n` +
        `\`${data.email}\`\n\n` +
        `• \`.tempmail inbox\` — voir les mails\n` +
        `• \`.tempmail lire 1\` — lire le n°1\n` +
        `• \`.tempmail stop\` — oublier\n\n` +
        `_Valable ~1h sur cette session. Beaucoup de sites bloquent les temp-mails._`,
        msg
      );
    } catch (err) {
      console.error('[tempmail]', err);
      return replyText(sock, jid, 'Impossible de générer une adresse (API hors ligne). Réessaie plus tard.', msg);
    }
  }
};
