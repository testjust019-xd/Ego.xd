/**
 * Helpers pour messages interactifs (boutons, listes, nativeFlow)
 * Format compatible baron-baileys-v2 (API plate, pas listMessage imbriqué)
 */
const { simulatePresence } = require('./presence');
const { trackMessage } = require('../lib/messageTracker');

/**
 * Boutons de réponse simples
 * Baron préfère interactiveButtons (quick_reply)
 */
async function replyButtons(sock, jid, text, buttons = [], quoted = null, footer = null) {
  return replyNativeButtons(sock, jid, text, buttons, quoted, footer);
}

/**
 * Boutons via interactiveButtons / quick_reply (format Baron)
 */
async function replyNativeButtons(sock, jid, text, buttons = [], quoted = null, footer = null) {
  await simulatePresence(sock, jid);

  const interactiveButtons = buttons.slice(0, 3).map((b) => ({
    name: 'quick_reply',
    buttonParamsJson: JSON.stringify({
      display_text: String(b.text),
      id: String(b.id)
    })
  }));

  const content = {
    text: String(text || ''),
    footer: footer ? String(footer) : undefined,
    interactiveButtons
  };

  try {
    const sent = await sock.sendMessage(jid, content, { quoted });
    if (sent?.key) trackMessage(jid, sent.key);
    return sent;
  } catch (err) {
    console.error('[interactive] replyNativeButtons:', err.message);
    // Fallback texte brut
    const lines = buttons.map((b) => `• ${b.text}`).join('\n');
    const sent = await sock.sendMessage(
      jid,
      { text: `${text}\n\n${lines}${footer ? '\n\n_' + footer + '_' : ''}` },
      { quoted }
    );
    if (sent?.key) trackMessage(jid, sent.key);
    return sent;
  }
}

/**
 * Message liste — format Baron plat :
 * { text, title, buttonText, footer, sections }
 * Fallback : single_select dans interactiveButtons
 */
async function replyList(sock, jid, opts, quoted = null) {
  await simulatePresence(sock, jid);

  const title = String(opts.title || 'Menu');
  const description = String(opts.description || '');
  const buttonText = String(opts.buttonText || 'Ouvrir');
  const footer = opts.footer ? String(opts.footer) : undefined;
  const sections = (opts.sections || []).map((s) => ({
    title: String(s.title || ''),
    rows: (s.rows || []).map((r) => ({
      title: String(r.title || ''),
      rowId: String(r.rowId || r.id || ''),
      description: r.description != null ? String(r.description) : ''
    }))
  }));

  // 1) Format liste classique Baron (privé surtout)
  try {
    const content = {
      text: description || title,
      title,
      buttonText,
      footer,
      sections
    };
    const sent = await sock.sendMessage(jid, content, { quoted });
    if (sent?.key) trackMessage(jid, sent.key);
    return sent;
  } catch (err1) {
    console.error('[interactive] replyList (sections):', err1.message);
  }

  // 2) Fallback single_select (native flow)
  try {
    const nfSections = sections.map((s) => ({
      title: s.title,
      rows: s.rows.map((r) => ({
        header: r.title,
        title: r.title,
        description: r.description || '',
        id: r.rowId
      }))
    }));

    const content = {
      text: description || title,
      title,
      footer,
      interactiveButtons: [
        {
          name: 'single_select',
          buttonParamsJson: JSON.stringify({
            title: buttonText,
            sections: nfSections
          })
        }
      ]
    };
    const sent = await sock.sendMessage(jid, content, { quoted });
    if (sent?.key) trackMessage(jid, sent.key);
    return sent;
  } catch (err2) {
    console.error('[interactive] replyList (single_select):', err2.message);
  }

  // 3) Fallback texte
  let text = `*${title}*\n${description}\n\n`;
  for (const s of sections) {
    text += `*${s.title}*\n`;
    for (const r of s.rows) {
      text += `• ${r.title}${r.description ? ' — ' + r.description : ''}\n`;
    }
    text += '\n';
  }
  if (footer) text += `_${footer}_`;
  const sent = await sock.sendMessage(jid, { text }, { quoted });
  if (sent?.key) trackMessage(jid, sent.key);
  return sent;
}

/**
 * Template buttons (quick reply / url / call) — best effort
 */
async function replyTemplate(sock, jid, text, buttons = [], quoted = null) {
  await simulatePresence(sock, jid);

  const interactiveButtons = buttons.map((b) => {
    if (b.url) {
      return {
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: String(b.text),
          url: String(b.url),
          merchant_url: String(b.url)
        })
      };
    }
    if (b.phone) {
      return {
        name: 'cta_call',
        buttonParamsJson: JSON.stringify({
          display_text: String(b.text),
          phone_number: String(b.phone)
        })
      };
    }
    return {
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: String(b.text),
        id: String(b.id)
      })
    };
  });

  try {
    const sent = await sock.sendMessage(
      jid,
      { text: String(text), interactiveButtons },
      { quoted }
    );
    if (sent?.key) trackMessage(jid, sent.key);
    return sent;
  } catch (err) {
    console.error('[interactive] replyTemplate:', err.message);
    return replyNativeButtons(sock, jid, text, buttons.filter((b) => b.id), quoted);
  }
}

/**
 * Parse un clic de bouton / sélection de liste
 */
function parseInteractiveResponse(msg) {
  const content = msg.message || {};

  const btn = content.buttonsResponseMessage;
  if (btn?.selectedButtonId) {
    return { type: 'button', id: btn.selectedButtonId };
  }

  const list = content.listResponseMessage;
  if (list?.singleSelectReply?.selectedRowId) {
    return { type: 'list', id: list.singleSelectReply.selectedRowId };
  }

  const tpl = content.templateButtonReplyMessage;
  if (tpl?.selectedId) {
    return { type: 'button', id: tpl.selectedId };
  }

  const inter = content.interactiveResponseMessage;
  if (inter?.nativeFlowResponseMessage) {
    try {
      const params = JSON.parse(inter.nativeFlowResponseMessage.paramsJson || '{}');
      return {
        type: 'button',
        id: params.id || params.selectedId || params.rowId || null
      };
    } catch (_) {}
  }

  return { type: null, id: null };
}

module.exports = {
  replyButtons,
  replyNativeButtons,
  replyList,
  replyTemplate,
  parseInteractiveResponse
};
