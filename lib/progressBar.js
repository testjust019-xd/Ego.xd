/**
 * Barre de progression — un seul message édité (WA edit).
 *
 * sock.sendMessage(jid, { text, edit: key })
 * - uniquement tes messages
 * - surtout du texte
 * - parfois refusé en groupe / session LID / délai long
 * - fallback: nouveau message si l'edit échoue
 */

function progressBar(current, total, width = 12) {
  const t = Math.max(1, total);
  const c = Math.max(0, Math.min(current, t));
  const filled = Math.round((c / t) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const pct = Math.round((c / t) * 100);
  return '`[' + bar + ']` *' + pct + '%*';
}

/**
 * @returns {{ update: Function, done: Function, getKey: Function }}
 */
function createProgress(sock, jid, quoted = null) {
  let key = null;
  let lastText = '';

  async function update(text) {
    lastText = text;
    try {
      if (key) {
        const sent = await sock.sendMessage(jid, { text, edit: key });
        if (sent && sent.key) key = sent.key;
        return sent;
      }
      const sent = await sock.sendMessage(jid, { text }, { quoted });
      key = sent && sent.key ? sent.key : null;
      return sent;
    } catch (err) {
      console.error('[progress] edit fail → new msg:', err.message);
      try {
        const sent = await sock.sendMessage(jid, { text });
        key = sent && sent.key ? sent.key : null;
        return sent;
      } catch (e2) {
        console.error('[progress] send fail:', e2.message);
        return null;
      }
    }
  }

  return {
    update,
    done: (text) => update(text || lastText),
    getKey: () => key
  };
}

module.exports = { progressBar, createProgress };
