/**
 * Point d'entrée Render / production
 * - Serveur HTTP (health + page Triple Ego + /api/pair + /api/chat)
 * - Bot WhatsApp (index.js)
 *
 * Le pairing web utilise le MÊME createSession que la commande .pair.
 */
require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./config');
// Préfixe runtime (persisté via .setprefix)
try {
  const _fs = require('fs');
  const _sp = require('path').join(__dirname, 'data', 'settings.json');
  if (_fs.existsSync(_sp)) {
    const _s = JSON.parse(_fs.readFileSync(_sp, 'utf-8'));
    if (_s.prefix) config.prefix = _s.prefix;
    if (_s.activeTheme) { /* themeManager lit settings lui-même */ }
  }
} catch (_) {}

const { getLocalAIResponse } = require('./lib/localAI');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const webViews = require('./lib/webViews');
const webAuth = require('./lib/webAuth');
const gameWeb = require('./helpers/gameWeb');
const { log, readRecentLogs } = require('./lib/logger');
const gameHistory = require('./lib/gameHistory');
const { getLeaderboard, getUser } = require('./lib/database');
const { startKeepAlive } = require('./lib/keepAlive');

const PORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
  path: '/socket.io'
});

let socketClients = 0;
let lastError = null;

app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'web', 'public')));

// ── Vues web des jeux/commandes (.course, .duel, .pendu, ...) ──
// Relais live : toute mise à jour de state (gameWeb.updateGame /
// webViews.update) est diffusée aux clients connectés à cette partie.
webViews.onAnyUpdate(async (gameId, state, type) => {
  const view = webViews.get(gameId);
  if (!view) return;
  const sockets = await io.in(gameId).fetchSockets();
  for (const s of sockets) {
    const filtered = gameWeb.viewStateFor(view, { role: s.data.role, jid: s.data.jid });
    s.emit('state', { state: filtered, type, role: s.data.role || null });
  }
});
webViews.onAnyClose((gameId) => {
  io.to(gameId).emit('closed', {});
});

io.on('connection', (socket) => {
  socketClients++;
  socket.on('disconnect', () => { socketClients = Math.max(0, socketClients - 1); });

  // Hub factory live
  socket.on('hub:join', (room) => {
    try {
      if (room === 'factory') socket.join('factory');
      else if (typeof room === 'string' && room.startsWith('factory:')) socket.join(room);
    } catch (_) {}
  });
  socket.on('hub:leave', (room) => {
    try { if (room) socket.leave(room); } catch (_) {}
  });

  socket.on('join', (token) => {
    const check = gameWeb.canView(token);
    if (!check.ok) {
      socket.emit('error', { error: check.error });
      return;
    }
    socket.join(check.payload.gid);
    socket.data.gid = check.payload.gid;
    socket.data.role = check.payload.role;
    socket.data.jid = check.payload.jid;
    socket.emit('state', {
      state: gameWeb.viewStateFor(check.view, { role: check.payload.role, jid: check.payload.jid }),
      type: check.view.type,
      role: check.payload.role || null
    });
  });

  socket.on('action', async (msg = {}) => {
    const { token, action, data } = msg;
    const check = gameWeb.canAct(token);
    if (!check.ok) {
      socket.emit('actionError', { error: check.error });
      return;
    }
    if (typeof check.view.onAction !== 'function') {
      socket.emit('actionError', { error: 'Action non supportée pour ce jeu.' });
      return;
    }
    try {
      const result = await check.view.onAction({
        role: check.payload.role,
        jid: check.payload.jid,
        action,
        data
      });
      if (result && result.error) socket.emit('actionError', { error: result.error });
    } catch (err) {
      lastError = err.message;
      log.web.error('socket action', err.message);
      socket.emit('actionError', { error: err.message || 'Erreur.' });
    }
  });
});

// Page + API REST (fallback si un client n'utilise pas de WebSocket)
app.get('/g/:token', (req, res) => {
  const check = gameWeb.canView(req.params.token);
  if (!check.ok) return res.status(404).send(check.error);
  res.sendFile(path.join(__dirname, 'web', 'public', 'game.html'));
});

app.get('/api/g/:token/state', (req, res) => {
  const check = gameWeb.canView(req.params.token);
  if (!check.ok) return res.status(404).json({ error: check.error });
  const filtered = gameWeb.viewStateFor(check.view, { role: check.payload.role, jid: check.payload.jid });
  res.json({ type: check.view.type, state: filtered, role: check.payload.role });
});

app.post('/api/g/:token/action', async (req, res) => {
  const check = gameWeb.canAct(req.params.token);
  if (!check.ok) return res.status(403).json({ error: check.error });
  if (typeof check.view.onAction !== 'function') {
    return res.status(400).json({ error: 'Action non supportée pour ce jeu.' });
  }
  try {
    const result = await check.view.onAction({
      role: check.payload.role,
      jid: check.payload.jid,
      action: req.body?.action,
      data: req.body?.data
    });
    res.json(result || { ok: true });
  } catch (err) {
    lastError = err.message;
    log.web.error('api action', err.message);
    res.status(400).json({ error: err.message || 'Erreur.' });
  }
});

// ── Classement web ──
app.get('/top', (_req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'top.html'));
});
app.get('/api/top', (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 15);
  try {
    const top = getLeaderboard(limit).map((u, i) => ({
      rank: i + 1,
      jid: u.jid,
      name: String(u.jid).split('@')[0],
      balance: u.balance || 0
    }));
    res.json({ top });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Thème actif ──
app.get('/api/theme', (_req, res) => {
  let active = config.defaultTheme || 'tripleego';
  try {
    const s = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'data', 'settings.json'), 'utf8'));
    if (s.activeTheme) active = s.activeTheme;
  } catch (_) {}
  const t = config.themes?.[active] || config.themes?.tripleego || { color: '#8B5CF6', displayName: 'EGO.XD' };
  res.json({ id: active, color: t.color, displayName: t.displayName, quote: t.quote });
});

// ── Liste de tous les thèmes (pour générer les cartes du site dynamiquement) ──
app.get('/api/themes', (_req, res) => {
  let active = config.defaultTheme || 'tripleego';
  try {
    const s = JSON.parse(require('fs').readFileSync(path.join(__dirname, 'data', 'settings.json'), 'utf8'));
    if (s.activeTheme) active = s.activeTheme;
  } catch (_) {}
  const list = Object.entries(config.themes || {}).map(([id, t]) => ({
    id,
    displayName: t.displayName,
    color: t.color,
    quote: t.quote,
    asamaTag: t.asamaTag
  }));
  res.json({ active, themes: list });
});

// ── Album cartes (lecture seule, pas besoin de token de jeu) ──
app.get('/album/:jid', (_req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'album.html'));
});
app.get('/api/album/:jid', (req, res) => {
  try {
    const jidParam = req.params.jid.includes('@') ? req.params.jid : req.params.jid + '@s.whatsapp.net';
    const user = getUser(jidParam);
    const cards = Array.isArray(user.cards) ? user.cards : [];
    res.json({ jid: jidParam, cards, count: cards.length, balance: user.balance || 0 });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Admin (protégé par ADMIN_TOKEN / config.webGames.adminToken) ──
function adminAuthorized(req) {
  const expected = process.env.ADMIN_TOKEN || config.webGames?.adminToken || '';
  const token = req.query.token || req.headers['x-admin-token'] || '';
  return !!expected && token === expected;
}
app.get('/admin', (req, res) => {
  if (!adminAuthorized(req)) return res.status(401).send('Unauthorized — ajoute ?token=TON_ADMIN_TOKEN');
  res.sendFile(path.join(__dirname, 'web', 'public', 'admin.html'));
});
app.get('/api/admin/stats', (req, res) => {
  if (!adminAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
  const hist = gameHistory.stats();
  res.json({
    uptime: Math.floor(process.uptime()),
    socketClients,
    activeGames: webViews.activeCount(),
    history: hist,
    recent: gameHistory.recent(20),
    logs: readRecentLogs(40),
    lastError
  });
});

app.get('/health', (_req, res) => {
  const hist = gameHistory.stats();
  res.status(200).json({
    ok: true,
    bot: config.botName || 'EGO.XD',
    uptime: Math.floor(process.uptime()),
    ts: Date.now(),
    socketClients,
    activeGames: webViews.activeCount(),
    gamesHistory: hist.total,
    gamesByType: hist.byType,
    lastError
  });
});

// ── Hébergement de fichiers via Telegram (upload → lien /f/:id) ──
try {
  require('./web/fileHost').register(app);
} catch (e) {
  console.warn('[start] file host non chargé:', e.message);
}

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'web', 'public', 'index.html'));
});

// ── Pairing + stats + chat (même moteur que .pair) ──
const lastRequestByIp = new Map();
const COOLDOWN_MS = 30_000;
const chatBuckets = new Map();
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

/**
 * Petit limiteur "N requêtes par fenêtre" réutilisable, par clé arbitraire
 * (IP, numéro de téléphone, etc.). Utilisé pour éviter le spam de codes
 * de pairing / OTP WhatsApp vers un numéro (le sien ou celui d'un tiers).
 */
function makeBucketLimiter(windowMs, maxPerWindow) {
  const buckets = new Map();
  return function check(key) {
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    if (b.count >= maxPerWindow) {
      return { ok: false, waitSec: Math.ceil((b.resetAt - now) / 1000) };
    }
    b.count += 1;
    return { ok: true };
  };
}

// Pairing (.pair web) : au plus 1 demande / 30s par IP (déjà existant) ET
// au plus 3 demandes / 10 min pour un même numéro cible, quelle que soit l'IP.
const pairPhoneLimiter = makeBucketLimiter(10 * 60 * 1000, 3);

// OTP hub : au plus 5 demandes / 10 min par IP, et au plus 3 / 10 min par numéro
// cible — sinon n'importe qui peut faire spammer des messages WhatsApp à
// n'importe quel numéro sans aucune limite.
const otpIpLimiter = makeBucketLimiter(10 * 60 * 1000, 5);
const otpPhoneLimiter = makeBucketLimiter(10 * 60 * 1000, 3);

const SYSTEM_PROMPT = `Tu es l'assistant IA d'EGO.XD, un bot WhatsApp thématique (Blue Lock / Solo Leveling / Jujutsu Kaisen).
Créateur : ${config.creator || 'Dylan'}.
Réponds en français, style concis, un peu "ego" / monarque, sans être toxique.
Tu peux aider sur :
- comment lier WhatsApp via cette page (entrer le numéro → AWAKEN → code)
- commandes du bot (.menu, .store, .redeem, rangs E→Monarch, etc.)
- magasin : ${config.storeUrl || ''}
- YouTube : ${config.youtube?.devilskills || ''} | ${config.youtube?.soccervibe || ''}
- support : ${config.supportGroupLink || ''}
- paiement : ${config.donateInfo || ''}
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
    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 500 })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error?.message || `Groq HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content?.trim() || '';
}

try {
  const { createSession, listSessions } = require('./lib/sessionManager');

  app.get('/api/stats', (_req, res) => {
    const sessions = listSessions();
    res.json({ totalSessions: sessions.length, connected: sessions.length });
  });

  /**
   * Même logique que .pair :
   * crée une session Baileys + requestPairingCode(numéro)
   * Body: { phoneNumber, force?: true }
   * Note: crée une session SECONDAIRE (web_NUMERO), pas la session principale du bot.
   */
  app.post('/api/pair', async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const last = lastRequestByIp.get(ip) || 0;
    if (now - last < COOLDOWN_MS) {
      const waitSec = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
      return res.status(429).json({ error: `Attends ${waitSec}s avant une nouvelle demande.` });
    }

    const phoneNumber = String(req.body?.phoneNumber || '').replace(/[^0-9]/g, '');
    if (!phoneNumber || phoneNumber.length < 8 || phoneNumber.length > 15) {
      return res.status(400).json({
        error: 'Numéro invalide. Format international, chiffres uniquement, sans + (ex: 2250700000000).'
      });
    }

    const phoneCheck = pairPhoneLimiter(phoneNumber);
    if (!phoneCheck.ok) {
      return res.status(429).json({
        error: `Trop de demandes de code pour ce numéro. Réessaie dans ${phoneCheck.waitSec}s.`
      });
    }

    const force = !!(req.body?.force === true || req.body?.force === '1' || req.body?.force === 1);

    lastRequestByIp.set(ip, now);
    // Nom de session stable (comme .pair utilise un nom) — préfixe web_
    const sessionName = `web_${phoneNumber}`;

    try {
      const code = await new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Timeout génération code (35s). Réessaie dans 1 min.')), 35000);
        createSession(sessionName, phoneNumber, (code, err) => {
          clearTimeout(t);
          if (err) reject(err);
          else if (!code) reject(new Error('Code vide reçu.'));
          else resolve(code);
        }, { force }).catch((e) => {
          clearTimeout(t);
          reject(e);
        });
      });

      console.log(`[web-pair] code OK session=${sessionName} force=${force}`);
      res.json({
        code,
        sessionName,
        phoneNumber,
        force,
        hint: 'WhatsApp → Appareils liés → Lier un appareil → Lier avec un numéro de téléphone → entre ce code. (session secondaire, pas le bot principal)'
      });
    } catch (err) {
      console.error('[web-pair]', err.message);
      res.status(500).json({
        error: err.message || 'Impossible de générer le code. Réessaie.'
      });
    }
  });

  app.post('/api/chat', async (req, res) => {
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const limit = chatAllowed(ip);
    if (!limit.ok) {
      return res.status(429).json({ error: `Trop de messages. Réessaie dans ${limit.waitSec}s.` });
    }

    const message = String(req.body?.message || '').trim().slice(0, 800);
    if (!message) return res.status(400).json({ error: 'Message vide.' });

    let history = Array.isArray(req.body?.history) ? req.body.history : [];
    history = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-CHAT_HISTORY_MAX)
      .map((m) => ({ role: m.role, content: String(m.content).slice(0, 800) }));

    try {
      const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history,
        { role: 'user', content: message }
      ];
      const reply = await callGroq(messages);
      if (reply) return res.json({ reply, source: 'groq' });
    } catch (err) {
      console.warn('[web-chat] Groq:', err.message);
    }

    const local = getLocalAIResponse(message);
    if (local) return res.json({ reply: local, source: 'local' });

    return res.json({
      reply:
        config.ai?.fallbackMessage ||
        "Je n'ai pas bien compris. Demande le pairing, le magasin, les rangs ou les commandes.",
      source: 'fallback'
    });
  });
} catch (e) {
  console.warn('[start] routes session/chat non chargées:', e.message);
}


// ── Hub web connecté au bot (pool, factory, groupes, top, login, staff) ──
try {
  const peopleDB = require('./lib/peopleDB');
  const groupsDB = require('./lib/groupsDB');
  const webLogin = require('./lib/webLogin');
  let profileCard; try { profileCard = require('./lib/profileCard'); } catch (_) { profileCard = null; }
  const groupFactory = require('./lib/groupFactory');
  const { getLeaderboard } = require('./lib/database');
  const { getHunter } = require('./lib/hunterDB');
  const { getUserRank } = require('./lib/rankGate');
  const { progressBar } = require('./lib/groupFactory');

  try { groupFactory.setHubIo(io); } catch (_) {}

  function staffOk(req) {
    const expected = process.env.ADMIN_TOKEN || config.webGames?.adminToken || '';
    if (!expected) return false;
    const token = req.query.token || req.headers['x-admin-token'] || '';
    return token === expected;
  }

  app.get('/hub', (_req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'public', 'hub.html'));
  });

  app.get('/group/:code', (_req, res) => {
    res.sendFile(path.join(__dirname, 'web', 'public', 'hub.html'));
  });

  app.get('/api/hub/overview', (_req, res) => {
    try {
      const pool = peopleDB.poolStats();
      const groups = Object.values(groupsDB.loadGroups());
      const building = groups.filter((g) => g.status === 'building').length;
      const open = groups.filter((g) => g.status === 'open').length;
      const jobs = groupsDB.listRunningJobs();
      res.json({
        ok: true,
        bot: config.botName || 'EGO.XD',
        uptime: Math.floor(process.uptime()),
        pool: { total: pool.total, optIn: pool.optIn, tags: pool.tags },
        factory: {
          groupsTotal: groups.length,
          building,
          open,
          jobsRunning: jobs.length
        },
        sessions: (() => {
          try {
            const { listSessions } = require('./lib/sessionManager');
            return listSessions().length;
          } catch {
            return 0;
          }
        })()
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/hub/pool', (_req, res) => {
    try {
      const stats = peopleDB.poolStats();
      const tagList = Object.entries(stats.tags || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([tag, count]) => ({ tag, count }));
      res.json({ total: stats.total, optIn: stats.optIn, tags: tagList });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/hub/groups', (req, res) => {
    try {
      const limit = Math.min(50, parseInt(req.query.limit || '20', 10) || 20);
      const groups = Object.values(groupsDB.loadGroups())
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, limit)
        .map((g) => {
          const job = groupsDB.getJob(g.id);
          const pending = job?.queue?.length ?? (g.pending || []).length;
          const done = job?.done?.length ?? (g.members || []).length;
          return {
            id: g.id,
            name: g.name,
            code: g.inviteCode,
            status: g.status,
            source: g.source,
            members: done,
            pending,
            createdAt: g.createdAt,
            filters: g.filters || {}
          };
        });
      res.json({ groups });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/hub/group/:code', (req, res) => {
    try {
      const rec = groupsDB.getByCode(String(req.params.code || '').toUpperCase());
      if (!rec) return res.status(404).json({ error: 'Groupe introuvable.' });
      const job = groupsDB.getJob(rec.id);
      const pending = job?.queue?.length ?? (rec.pending || []).length;
      const doneList = job?.done || rec.members || [];
      const failed = job?.failed || [];
      const done = doneList.length;
      const total = done + failed.length + pending;
      const roster = (rec.members || []).slice(0, 80).map((j) => {
        const p = peopleDB.get(j);
        let rank = 'E';
        try { rank = getUserRank(j); } catch (_) {}
        return {
          jid: String(j).split('@')[0],
          tags: p?.tags || [],
          rank,
          optIn: !!p?.optIn
        };
      });
      const timeline = (rec.timeline || []).slice(-40).reverse();
      res.json({
        id: rec.id,
        name: rec.name,
        code: rec.inviteCode,
        status: rec.status,
        source: rec.source,
        members: done,
        pending,
        failed: failed.length,
        total,
        progressPct: total ? Math.round((done / total) * 100) : (rec.status === 'open' ? 100 : 0),
        bar: progressBar(done, total || 1),
        filters: rec.filters || {},
        createdAt: rec.createdAt,
        openedAt: rec.openedAt || null,
        jobStatus: job?.status || null,
        roster,
        timeline
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get('/api/hub/top', (req, res) => {
    try {
      const limit = Math.min(30, parseInt(req.query.limit || '10', 10) || 10);
      const top = getLeaderboard(limit).map((u, i) => {
        let rank = 'E';
        try { rank = getHunter(u.jid).rank; } catch (_) {}
        return {
          rank: i + 1,
          jid: String(u.jid || '').split('@')[0],
          balance: u.balance || 0,
          hunterRank: rank
        };
      });
      res.json({ top });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Login OTP WhatsApp ──
  app.post('/api/hub/login/request', async (req, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || 'unknown';
      const ipCheck = otpIpLimiter(ip);
      if (!ipCheck.ok) {
        return res.status(429).json({ error: `Trop de demandes. Réessaie dans ${ipCheck.waitSec}s.` });
      }

      const phone = String(req.body?.phone || '').replace(/\D/g, '');
      const phoneCheck = otpPhoneLimiter(phone);
      if (!phoneCheck.ok) {
        return res.status(429).json({
          error: `Trop de codes demandés pour ce numéro. Réessaie dans ${phoneCheck.waitSec}s.`
        });
      }

      const { jid, code, expiresInSec } = webLogin.createLoginCode(phone);
      const sock = groupFactory.getSock();
      if (!sock) {
        return res.status(503).json({ error: 'Bot WhatsApp hors ligne. Réessaie plus tard.' });
      }
      await sock.sendMessage(jid, {
        text:
          `🔐 *EGO.XD HUB — CODE*\n\n` +
          `Ton code : *${code}*\n` +
          `Valable ${Math.floor(expiresInSec / 60)} min.\n` +
          `Ne le partage à personne.`
      });
      res.json({ ok: true, expiresInSec, hint: 'Code envoyé sur WhatsApp' });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/hub/login/verify', (req, res) => {
    try {
      const phone = String(req.body?.phone || '').replace(/\D/g, '');
      const code = String(req.body?.code || '').trim();
      const out = webLogin.verifyLoginCode(phone, code);
      res.json({ ok: true, token: out.token, jid: out.jid, exp: out.exp });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get('/api/hub/me', (req, res) => {
    try {
      const session = webLogin.sessionFromAuthHeader(req);
      if (!session) return res.status(401).json({ error: 'Non connecté' });
      const p = peopleDB.ensure(session.jid) || peopleDB.get(session.jid) || {};
      let rank = 'E';
      try { rank = getUserRank(session.jid); } catch (_) {}
      const allGroups = Object.values(groupsDB.loadGroups()).filter(
        (g) =>
          g.ownerJid === session.jid ||
          (g.members || []).includes(session.jid) ||
          (p.groups || []).includes(g.id)
      );
      res.json({
        jid: session.jid,
        display: String(session.jid).split('@')[0],
        rank,
        optIn: !!p.optIn,
        tags: p.tags || [],
        groups: allGroups.map((g) => ({
          name: g.name,
          code: g.inviteCode,
          status: g.status,
          role: g.ownerJid === session.jid ? 'owner' : 'member'
        }))
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Staff (ADMIN_TOKEN) ──
  app.post('/api/hub/staff/job/:id/force', async (req, res) => {
    if (!staffOk(req)) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const job = groupsDB.getJob(req.params.id);
      if (!job) return res.status(404).json({ error: 'Job introuvable' });
      if (job.status === 'paused') {
        groupsDB.updateJob(job.groupId, { status: 'running', nextAt: Date.now() });
      } else {
        groupsDB.updateJob(job.groupId, { nextAt: Date.now() });
      }
      await groupFactory.processOneJob(groupsDB.getJob(req.params.id));
      res.json({ ok: true, job: groupsDB.getJob(req.params.id) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/hub/staff/job/:id/pause', (req, res) => {
    if (!staffOk(req)) return res.status(401).json({ error: 'Unauthorized' });
    const job = groupsDB.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job introuvable' });
    groupsDB.updateJob(job.groupId, { status: 'paused' });
    res.json({ ok: true, status: 'paused' });
  });

  app.post('/api/hub/staff/job/:id/resume', (req, res) => {
    if (!staffOk(req)) return res.status(401).json({ error: 'Unauthorized' });
    const job = groupsDB.getJob(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job introuvable' });
    groupsDB.updateJob(job.groupId, { status: 'running', nextAt: Date.now() + 5000 });
    res.json({ ok: true, status: 'running' });
  });

  
  // Profile Card
  if (profileCard) {
    app.get('/api/hub/card.svg', (req, res) => {
      try {
        const session = webLogin.sessionFromAuthHeader(req);
        if (!session) return res.status(401).type('text').send('Login requis');
        const { svg } = require('./lib/profileCard');
        const data = profileCard.collectProfile(session.jid);
        res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
        res.setHeader('Cache-Control', 'private, max-age=60');
        res.send(profileCard.buildSvg(data));
      } catch (e) {
        res.status(500).send(e.message);
      }
    });

    app.get('/api/hub/me/card', async (req, res) => {
      try {
        const session = webLogin.sessionFromAuthHeader(req);
        if (!session) return res.status(401).json({ error: 'Login requis' });
        const card = await profileCard.buildCard(session.jid);
        res.json({
          profile: card.profile,
          text: card.text,
          svgUrl: '/api/hub/card.svg'
        });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    app.get('/api/hub/card/:digits', (req, res) => {
      try {
        const digits = String(req.params.digits || '').replace(/\D/g, '');
        if (digits.length < 8) return res.status(400).json({ error: 'id invalide' });
        const data = profileCard.collectProfile(digits);
        res.json({ profile: data, text: profileCard.textCard(data) });
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
  }

  app.get('/api/hub/staff/jobs', (req, res) => {
    if (!staffOk(req)) return res.status(401).json({ error: 'Unauthorized' });
    const jobs = Object.values(groupsDB.loadJobs()).map((j) => ({
      groupId: j.groupId,
      status: j.status,
      queue: (j.queue || []).length,
      done: (j.done || []).length,
      failed: (j.failed || []).length,
      nextAt: j.nextAt
    }));
    res.json({ jobs });
  });
} catch (e) {
  console.warn('[hub] routes non chargées:', e.message);
}


server.listen(PORT, '0.0.0.0', () => {
  const publicUrl = process.env.PUBLIC_URL || config.publicUrl || `http://localhost:${PORT}`;
  console.log(`🌐 HTTP prêt sur 0.0.0.0:${PORT}`);
  console.log(`   Health  : ${publicUrl}/health`);
  console.log(`   Pairing : ${publicUrl}/`);
  console.log(`   Jeux web: ${publicUrl}/g/<token> (Socket.IO)`);
  console.log(`   Top     : ${publicUrl}/top`);
  console.log(`   Admin   : ${publicUrl}/admin?token=...`);
  console.log(`   Hub     : ${publicUrl}/hub`);
  console.log(`   Fichiers: ${publicUrl}/f/<id>  (upload: POST ${publicUrl}/api/files/upload)`);
  console.log(`   (même moteur que la commande .pair)`);
  try { startKeepAlive(); } catch (e) { console.warn('[keepalive]', e.message); }
});

// Bot WhatsApp
require('./index.js');
