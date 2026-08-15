const config = require('../config');
const { getModel } = require('./modelPrefs');

/**
 * Appelle un provider chat (groq / openRouter / gemini) et retourne le texte.
 * options: { provider, model, system, user, senderJid, max_tokens, temperature }
 */
async function chatCompletion(opts = {}) {
  const {
    provider = 'groq',
    model: modelOverride = null,
    system = null,
    user,
    senderJid = null,
    max_tokens = 800,
    temperature = 0.6
  } = opts;

  if (!user) throw new Error('user message required');

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: user });

  if (provider === 'groq') {
    const key = config.groq?.apiKey;
    if (!key || key === 'TA_CLE_GROQ_ICI') throw new Error('NO_GROQ_KEY');
    const model = modelOverride || getModel('groq', senderJid) || config.groq.model;
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Groq error');
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'openRouter' || provider === 'ias') {
    const key = config.openRouter?.apiKey;
    if (!key || key === 'TA_CLE_OPENROUTER_ICI') throw new Error('NO_OPENROUTER_KEY');
    const model = modelOverride || getModel('openRouter', senderJid) || config.openRouter.model;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': config.openRouter?.siteUrl || 'https://arise-xd.local',
        'X-Title': config.openRouter?.siteName || config.botName || 'EGO.XD'
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens })
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || `HTTP ${res.status}`);
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'gemini') {
    const key = config.gemini?.apiKey;
    if (!key || key === 'TA_CLE_GEMINI_ICI') throw new Error('NO_GEMINI_KEY');
    const model = modelOverride || getModel('gemini', senderJid) || config.gemini?.model || 'gemini-3.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: {
        temperature,
        maxOutputTokens: Math.max(max_tokens || 2048, 2048),
        // évite les coupures trop agressives
      }
    };
    // systemInstruction est le bon champ Gemini (pas un faux échange user/model)
    if (system) {
      body.systemInstruction = { parts: [{ text: system }] };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'Gemini error');
    const candidate = data.candidates?.[0];
    if (!candidate) {
      const block = data.promptFeedback?.blockReason || data.promptFeedback?.blockReasonMessage;
      throw new Error(block ? `Bloqué: ${block}` : 'Pas de candidat Gemini');
    }
    const text = candidate.content?.parts?.map(p => p.text).filter(Boolean).join('') || '';
    // Log si tronqué pour debug
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.warn('[gemini] finishReason=', candidate.finishReason);
    }
    return text;
  }

  throw new Error('Unknown provider');
}

/** Essaie Groq puis OpenRouter puis Gemini */
async function chatWithFallback(opts = {}) {
  const order = opts.order || ['groq', 'openRouter', 'gemini'];
  const errors = [];
  for (const provider of order) {
    try {
      const text = await chatCompletion({ ...opts, provider });
      if (text) return { text, provider };
    } catch (e) {
      errors.push(`${provider}: ${e.message}`);
    }
  }
  throw new Error(errors.join(' | ') || 'Tous les providers ont échoué');
}

module.exports = { chatCompletion, chatWithFallback };
