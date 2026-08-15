const form = document.getElementById('pair-form');
const phoneInput = document.getElementById('phone');
const generateBtn = document.getElementById('generate-btn');
const result = document.getElementById('result');
const statSessions = document.getElementById('stat-sessions');
const statConnected = document.getElementById('stat-connected');
const statDomains = document.getElementById('stat-domains');
const focusName = document.getElementById('focus-name');
const focusAvatar = document.getElementById('focus-avatar');
const focusPulse = document.getElementById('focus-pulse');
const domainsEl = document.getElementById('domains');
const heroTitle = document.getElementById('hero-title');
const heroSub = document.getElementById('hero-sub');
const heroQuote = document.getElementById('hero-quote');

let THEMES = {};      // id -> { displayName, color, quote, asamaTag }
let activeThemeId = null;
let codeTimer = null;
let codeExpiresAt = 0;

function applyAccent(color) {
  if (!color) return;
  document.documentElement.style.setProperty('--accent', color);
}

function setFocus(id) {
  const t = THEMES[id];
  if (!t) return;
  activeThemeId = id;
  focusName.textContent = t.displayName;
  focusAvatar.textContent = (t.asamaTag || '').split(' ')[0] || '⛩';
  focusAvatar.style.background = `linear-gradient(135deg, var(--accent-2), ${t.color})`;
  focusPulse.style.background = t.color;
  focusPulse.style.boxShadow = `0 0 10px ${t.color}`;
  applyAccent(t.color);
  heroSub.textContent = (t.asamaTag || t.displayName || '').toUpperCase();
  heroQuote.textContent = t.quote || '';

  document.querySelectorAll('.domain-card').forEach((card) => {
    card.classList.toggle('active', card.dataset.domain === id);
  });
}

async function loadThemes() {
  try {
    const res = await fetch('/api/themes');
    const data = await res.json();
    THEMES = {};
    (data.themes || []).forEach((t) => { THEMES[t.id] = t; });
    statDomains.textContent = (data.themes || []).length;

    domainsEl.innerHTML = (data.themes || []).map((t) => `
      <button type="button" class="domain-card" data-domain="${t.id}" style="--card-c:${t.color}">
        <div class="domain-icon">${(t.asamaTag || '').split(' ')[0] || '⛩'}</div>
        <div class="domain-meta">
          <div class="domain-name">${t.displayName}</div>
          <div class="domain-title">${t.asamaTag || ''}</div>
          <div class="domain-quote">${t.quote || ''}</div>
        </div>
        <div class="domain-bar"></div>
      </button>
    `).join('');

    document.querySelectorAll('.domain-card').forEach((card) => {
      card.addEventListener('click', () => setFocus(card.dataset.domain));
    });

    setFocus(data.active || Object.keys(THEMES)[0]);
  } catch {
    domainsEl.innerHTML = '<div class="domains-loading mono tiny muted">Domaines indisponibles.</div>';
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    statSessions.textContent = data.totalSessions ?? 0;
    statConnected.textContent = data.connected ?? 0;
  } catch {
    statSessions.textContent = '0';
    statConnected.textContent = '0';
  }
}

function showResult(type, html) {
  result.className = `result ${type}`;
  result.innerHTML = html;
}

function formatTimer(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function startCodeTimer(el, durationMs = 5 * 60 * 1000) {
  if (codeTimer) clearInterval(codeTimer);
  codeExpiresAt = Date.now() + durationMs;
  const tick = () => {
    const left = codeExpiresAt - Date.now();
    if (left <= 0) {
      el.textContent = '00:00';
      clearInterval(codeTimer);
      return;
    }
    el.textContent = formatTimer(left);
  };
  tick();
  codeTimer = setInterval(tick, 1000);
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    return false;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const phoneNumber = phoneInput.value.replace(/[^0-9]/g, '');

  if (!phoneNumber || phoneNumber.length < 8) {
    showResult('error', 'Entre un numéro international valide (chiffres uniquement, sans +).');
    return;
  }

  generateBtn.disabled = true;
  generateBtn.querySelector('.btn-label').textContent = 'GÉNÉRATION…';
  result.className = 'result hidden';

  try {
    const res = await fetch('/api/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber })
    });
    const data = await res.json();

    if (data.error) {
      showResult('error', data.error);
    } else {
      const theme = THEMES[activeThemeId] || {};
      const hint = data.hint || 'WhatsApp → Appareils liés → Lier un appareil → Lier avec un numéro → entre ce code.';
      showResult(
        'success',
        `<div class="mono tiny muted" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
          <span><span class="live-dot" style="display:inline-block;margin-right:6px"></span>CODE ACTIF</span>
          <span class="timer-chip" style="height:auto;padding:4px 10px">EXPIRE <span id="code-timer">05:00</span></span>
        </div>
        <span class="result-code" id="pair-code">${data.code}</span>
        <div class="hint">${hint}</div>
        <div class="hint" style="margin-top:4px">Session : <b>web_${phoneNumber}</b> · Domaine : <b style="color:${theme.color || 'var(--accent)'}">${theme.displayName || ''}</b></div>
        <div class="copy-row">
          <button type="button" class="copy-btn" id="copy-btn">COPIER LE CODE</button>
        </div>`
      );

      const timerEl = document.getElementById('code-timer');
      if (timerEl) startCodeTimer(timerEl);

      const copyBtn = document.getElementById('copy-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
          const ok = await copyCode(data.code);
          copyBtn.textContent = ok ? 'COPIÉ' : 'ÉCHEC COPIE';
          setTimeout(() => { copyBtn.textContent = 'COPIER LE CODE'; }, 1800);
        });
      }

      loadStats();
    }
  } catch (err) {
    showResult('error', 'Erreur de connexion au serveur. Réessaie dans un instant.');
  } finally {
    generateBtn.disabled = false;
    generateBtn.querySelector('.btn-label').textContent = 'GÉNÉRER LE CODE';
  }
});

phoneInput.addEventListener('input', () => {
  const cleaned = phoneInput.value.replace(/[^0-9]/g, '');
  if (phoneInput.value !== cleaned) phoneInput.value = cleaned;
});

loadThemes();
loadStats();
setInterval(loadStats, 15000);

/* ── Chatbot IA ── */
(function initChatbot() {
  const toggle = document.getElementById('chat-toggle');
  const panel = document.getElementById('chat-panel');
  const closeBtn = document.getElementById('chat-close');
  const chatForm = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const messagesEl = document.getElementById('chat-messages');
  const sendBtn = document.getElementById('chat-send');
  if (!toggle || !panel || !chatForm) return;

  const history = [];

  function openChat() {
    panel.classList.remove('hidden');
    input.focus();
  }
  function closeChat() {
    panel.classList.add('hidden');
  }

  toggle.addEventListener('click', () => {
    if (panel.classList.contains('hidden')) openChat();
    else closeChat();
  });
  closeBtn.addEventListener('click', closeChat);

  function appendBubble(role, text, extraClass = '') {
    const div = document.createElement('div');
    div.className = `chat-bubble ${role} ${extraClass}`.trim();
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return div;
  }

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = input.value.trim();
    if (!message) return;

    input.value = '';
    appendBubble('user', message);
    history.push({ role: 'user', content: message });
    if (history.length > 24) history.splice(0, history.length - 24);

    sendBtn.disabled = true;
    const typing = appendBubble('bot', '…', 'typing');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: history.slice(0, -1)
        })
      });
      const data = await res.json();
      typing.remove();
      if (!res.ok || data.error) {
        appendBubble('bot', data.error || 'Erreur serveur.');
      } else {
        const reply = data.reply || '…';
        appendBubble('bot', reply);
        history.push({ role: 'assistant', content: reply });
      }
    } catch (err) {
      typing.remove();
      appendBubble('bot', 'Connexion perdue. Réessaie.');
    } finally {
      sendBtn.disabled = false;
      input.focus();
    }
  });
})();
