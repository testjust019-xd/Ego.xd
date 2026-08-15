const express = require('express');
const path = require('path');
const { createSession, listSessions } = require('../lib/sessionManager');
const config = require('../config');
const { getLocalAIResponse } = require('../lib/localAI');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Anti-abus pairing ──
const lastRequestByIp = new Map();
const COOLDOWN_MS = 30000;

// ── Anti-abus chat (par IP) ──
const chatBuckets = new Map(); // ip -> { count, resetAt }
const CHAT_WINDOW_MS = 60_000;
const CHAT_MAX_PER_WINDOW = 20;
const CHAT_HISTORY_MAX = 12;

function chatAllowed(ip) {
  const now = Date.now();
  let b = chatBuckets.get(ip);
  if (!b || now > b.resetAt) {
    b = { count: 0, resetAt: now + CHAT_WINDOW_MS };
    chatBuckets.set(ip, b);
  }
  if (b.count >= CHAT_MAX_PER_WINDOW) {
    return { ok: false, waitSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true };
}

const SYSTEM_PROMPT = `Tu es l'assistant IA d'EGO.XD, un bot WhatsApp thématique (Blue Lock / Solo Leveling / Jujutsu Kaisen).
Créateur : ${config.creator || 'Dylan'}.
Réponds en français, style concis, un peu "ego" / monarque, sans être toxique.
Tu peux aider sur :
- comment lier WhatsApp (pairing code sur ce site)
- commandes du bot (.menu, .store, .redeem, rangs E→Monarch, etc.)
- magasin digital : ${config.storeUrl || 'https://jolly-taiyaki-27b8c9.netlify.app/'}
- chaînes YouTube : ${config.youtube?.devilskills || ''} et ${config.youtube?.soccervibe || ''}
- support : ${config.supportGroupLink || ''}
- paiement : ${config.donateInfo || ''}
Si on te demande un code de pairing, explique qu'il faut entrer le numéro dans le formulaire AWAKEN EGO sur la page.
Ne invente pas de code WhatsApp. Ne révèle pas de clés API.`;

async function callGroq(messages) {
  const key = config.groq?.apiKey;
  if (!key || key === 'TA_CLE_GROQ_ICI') throw new Error('NO_GROQ_KEY');
  const model = config.groq?.model || 'llama-3.3-70b-versatile';
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 500
    })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Groq HTTP ${res.status}`);
  }
  return data.choices?.[0]?.message?.content?.trim() || '';
}

app.get('/api/stats', (req, res) => {
  const sessions = listSessions();
  res.json({ totalSessions: sessions.length, connected: sessions.length });
});

app.post('/api/pair', async (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  const last = lastRequestByIp.get(ip) || 0;

  if (now - last < COOLDOWN_MS) {
    const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
    return res.status(429).json({ error: `Attends ${waitSec}s avant une nouvelle demande.` });
  }

  const { phoneNumber } = req.body;
  if (!phoneNumber || !/^\d{8,15}$/.test(phoneNumber)) {
    return res.status(400).json({ error: 'Numéro invalide (format international, chiffres uniquement, sans +).' });
  }

  lastRequestByIp.set(ip, now);
  const sessionName = `web_${phoneNumber}`;

  try {
    const code = await new Promise((resolve, reject) => {
      createSession(sessionName, phoneNumber, (code, err) => {
        if (err) reject(err);
        else resolve(code);
      }).catch(reject);
    });
    res.json({ code });
  } catch (err) {
    console.error('[web-pair] erreur:', err.message);
    res.status(500).json({ error: "Impossible de générer le code pour l'instant. Réessaie." });
  }
});

/**
 * Chatbot IA web
 * body: { message: string, history?: [{role, content}] }
 */
app.post('/api/chat', async (req, res) => {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const limit = chatAllowed(ip);
  if (!limit.ok) {
    return res.status(429).json({ error: `Trop de messages. Réessaie dans ${limit.waitSec}s.` });
  }

  const message = String(req.body?.message || '').trim().slice(0, 800);
  if (!message) {
    return res.status(400).json({ error: 'Message vide.' });
  }

  // Historique client (borné)
  let history = Array.isArray(req.body?.history) ? req.body.history : [];
  history = history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-CHAT_HISTORY_MAX)
    .map(m => ({ role: m.role, content: String(m.content).slice(0, 800) }));

  // 1) Essai Groq
  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: message }
    ];
    const reply = await callGroq(messages);
    if (reply) {
      return res.json({ reply, source: 'groq' });
    }
  } catch (err) {
    console.warn('[web-chat] Groq:', err.message);
  }

  // 2) Fallback IA locale (mots-clés)
  const local = getLocalAIResponse(message);
  if (local) {
    return res.json({ reply: local, source: 'local' });
  }

  // 3) Message par défaut
  return res.json({
    reply:
      config.ai?.fallbackMessage ||
      "Je n'ai pas bien compris. Demande-moi le pairing, le magasin, les rangs, ou les commandes du bot.",
    source: 'fallback'
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Page de pairing + chatbot IA sur http://localhost:${PORT}`);
});
