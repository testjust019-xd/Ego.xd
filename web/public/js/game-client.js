(function () {
  const app = document.getElementById('app');
  const statusEl = document.getElementById('connStatus');

  const token = location.pathname.split('/g/')[1];
  if (!token) {
    app.innerHTML = '<div class="error-box">Lien invalide.</div>';
    return;
  }

  const socket = io({ path: '/socket.io' });
  let currentType = null;
  let currentState = null;
  let currentRole = null;

  function setStatus(kind, text) {
    statusEl.className = 'status status-' + kind;
    statusEl.textContent = text;
  }

  function sendAction(action, data) {
    socket.emit('action', { token, action, data });
  }
  window.__egoSendAction = sendAction;

  socket.on('connect', () => {
    setStatus('connecting', 'Connexion…');
    socket.emit('join', token);
  });

  socket.on('state', (payload) => {
    setStatus('live', '🟢 En direct');
    currentType = payload.type;
    currentState = payload.state;
    if (payload.role != null) currentRole = payload.role;
    render();
  });

  socket.on('closed', () => {
    setStatus('error', 'Terminé');
    app.innerHTML = '<div class="error-box">Cette partie est terminée.</div>';
  });

  socket.on('error', (e) => {
    setStatus('error', 'Erreur');
    app.innerHTML = `<div class="error-box">${escapeHtml(e.error || 'Erreur.')}</div>`;
  });

  let actionErrorTimer = null;
  socket.on('actionError', (e) => {
    let box = document.getElementById('actionErr');
    if (!box) {
      box = document.createElement('div');
      box.id = 'actionErr';
      box.className = 'card';
      box.style.borderColor = 'var(--red)';
      box.style.color = 'var(--red)';
      app.prepend(box);
    }
    box.textContent = '⚠️ ' + e.error;
    clearTimeout(actionErrorTimer);
    actionErrorTimer = setTimeout(() => box.remove(), 4000);
  });

  socket.on('disconnect', () => setStatus('connecting', 'Reconnexion…'));

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function render() {
    const renderer = RENDERERS[currentType] || RENDERERS.default;
    app.innerHTML = renderer(currentState, { role: currentRole });
    bindActions();
  }

  function bindActions() {
    app.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', () => {
        const action = el.getAttribute('data-action');
        let data = {};
        const dataAttr = el.getAttribute('data-value');
        if (dataAttr !== null) data.value = dataAttr;
        const inputSel = el.getAttribute('data-input');
        if (inputSel) {
          const input = app.querySelector(inputSel);
          if (input) data.value = input.value;
        }
        el.disabled = true;
        sendAction(action, data);
        setTimeout(() => { el.disabled = false; }, 600);
      });
    });
  }

  // ── Renderers par type ──────────────────────────────────────────

  function burstConfetti(count) {
    count = count || 28;
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    document.body.appendChild(layer);
    const colors = ['#3B82F6', '#8B5CF6', '#FBBF24', '#22C55E', '#EF4444', '#E0F2FE'];
    for (let i = 0; i < count; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1.4 + Math.random() * 1.6) + 's';
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.width = (6 + Math.random() * 6) + 'px';
      c.style.height = c.style.width;
      layer.appendChild(c);
    }
    setTimeout(() => layer.remove(), 3200);
  }

  const RENDERERS = {
    default(state) {
      return `<div class="card"><h1>${escapeHtml(state.title || 'Partie')}</h1>
        <pre class="muted" style="white-space:pre-wrap;font-size:13px;">${escapeHtml(JSON.stringify(state, null, 2))}</pre></div>`;
    },

    // .course, .chevaux — course animée v2
    race(state) {
      const rows = (state.participants || []).map((p, i) => {
        const rankCls = i === 0 ? ' rank1' : '';
        const pct = Math.min(100, p.progressPct || 0);
        const emoji = p.emoji || '🏎️';
        return `<div class="progress-track">
          <div class="progress-fill${rankCls}" data-target="${pct}" style="width:0%"></div>
          <span class="race-car" data-target="${pct}" style="left:0%">${emoji}</span>
          <div class="progress-label">${escapeHtml(p.name)}${p.player ? ' <span class="badge">TOI</span>' : ''}</div>
        </div>`;
      }).join('');
      setTimeout(() => {
        document.querySelectorAll('.progress-fill[data-target]').forEach(el => {
          el.style.width = el.getAttribute('data-target') + '%';
        });
        document.querySelectorAll('.race-car[data-target]').forEach(el => {
          el.style.left = el.getAttribute('data-target') + '%';
        });
        if (state.win > 0) setTimeout(() => burstConfetti(24), 1800);
      }, 80);
      const resultCls = state.win > 0 ? 'badge-win win-glow' : 'badge-lose';
      return `<div class="card">
        <h1>🏁 ${escapeHtml(state.title || 'Course')}</h1>
        <h2>Mise : ${state.stake ?? 0} pts</h2>
        ${rows}
        ${state.resultText ? `<div class="row result-pop" style="margin-top:14px;"><span class="badge ${resultCls}">${escapeHtml(state.resultText)}</span></div>` : ''}
      </div>`;
    },

    // .roulette — roue animée v2
    wheel(state) {
      const color = state.resultColor === 'rouge' ? 'var(--red)' : state.resultColor === 'noir' ? '#fff' : 'var(--green)';
      setTimeout(() => {
        const wheel = document.querySelector('.wheel-wrap');
        const result = document.querySelector('.wheel-result');
        const center = document.querySelector('.wheel-center');
        if (wheel) {
          wheel.classList.add('spinning');
          setTimeout(() => {
            if (center) {
              center.textContent = state.resultNumber;
              center.classList.add('reveal');
            }
            if (result) result.classList.add('show');
            if (state.win > 0) burstConfetti(32);
          }, 3000);
        }
      }, 50);
      const badgeCls = state.win > 0 ? 'badge-win win-glow' : 'badge-lose lose-shake';
      return `<div class="card">
        <h1>🎡 Roulette</h1>
        <h2>Mise : ${state.stake ?? 0} pts sur ${escapeHtml(String(state.bet))}</h2>
        <div style="position:relative;width:180px;margin:0 auto;">
          <div class="wheel-pointer"></div>
          <div class="wheel-wrap">
            <div class="wheel-center" style="color:${color}">?</div>
          </div>
        </div>
        <div class="wheel-result" style="color:${color}">${state.resultNumber}</div>
        <div class="row result-pop" style="justify-content:center;">
          <span class="badge ${badgeCls}">
            ${state.win > 0 ? '+' + state.win : state.stake ? '-' + state.stake : ''} pts
          </span>
        </div>
      </div>`;
    },

    // .slots — rouleaux animés v2
    reels(state) {
      const symbols = state.reels || ['❓','❓','❓'];
      const pool = ['🍒','🍋','🍊','🍇','⭐','💎','7️⃣','🔔','🍀'];
      const reelsHtml = symbols.map((s, i) =>
        `<div class="reel spinning" data-final="${s}" data-delay="${i * 220}">${pool[i % pool.length]}</div>`
      ).join('');
      setTimeout(() => {
        document.querySelectorAll('.reel.spinning').forEach(el => {
          const delay = parseInt(el.getAttribute('data-delay') || '0', 10);
          const final = el.getAttribute('data-final');
          // cycle symbols pendant le spin
          let tick = 0;
          const iv = setInterval(() => {
            el.textContent = pool[tick % pool.length];
            tick++;
          }, 80);
          setTimeout(() => {
            clearInterval(iv);
            el.classList.remove('spinning');
            el.classList.add('land');
            el.textContent = final;
            if (state.win > 0) el.classList.add('jackpot');
          }, 1100 + delay);
        });
        if (state.win > 0) setTimeout(() => burstConfetti(36), 1100 + symbols.length * 220);
      }, 60);
      const badgeCls = state.win > 0 ? 'badge-win win-glow' : 'badge-lose lose-shake';
      return `<div class="card">
        <h1>🎰 Machine à sous</h1>
        <h2>Mise : ${state.stake ?? 0} pts</h2>
        <div class="reel-row">${reelsHtml}</div>
        <div class="row result-pop" style="justify-content:center;margin-top:8px;">
          <span class="badge ${badgeCls}">
            ${state.win > 0 ? '+' + state.win : '-' + (state.stake || 0)} pts
          </span>
        </div>
      </div>`;
    },

    // .donjon, .loterie
    loot(state) {
      const items = (state.items || []).map(it => `<div class="log-entry">${escapeHtml(it)}</div>`).join('');
      return `<div class="card">
        <h1>🎁 ${escapeHtml(state.title || 'Butin')}</h1>
        <div class="log">${items}</div>
        ${state.resultText ? `<h2 style="margin-top:12px;">${escapeHtml(state.resultText)}</h2>` : ''}
      </div>`;
    },

    // .duel, .combat — multi temps réel
    battle(state, { role }) {
      const p1 = state.p1 || {}; const p2 = state.p2 || {};
      const hpCls = (hp) => hp <= 30 ? ' low' : '';
      const canAttack = !state.finished && role && (role === state.turnRole);
      const log = (state.log || []).slice(-8).reverse().map(l => `<div class="log-entry">${escapeHtml(l)}</div>`).join('');
      return `<div class="card">
        <h1>⚔️ ${escapeHtml(state.title || 'Duel')}</h1>
        <div class="row between"><span>${escapeHtml(p1.name || 'J1')}</span><span class="mono">${p1.hp ?? 100}/100</span></div>
        <div class="row"><div class="hpbar"><div class="hpbar-fill${hpCls(p1.hp ?? 100)}" style="width:${p1.hp ?? 100}%"></div></div></div>
        <div class="row between" style="margin-top:10px;"><span>${escapeHtml(p2.name || 'J2')}</span><span class="mono">${p2.hp ?? 100}/100</span></div>
        <div class="row"><div class="hpbar"><div class="hpbar-fill${hpCls(p2.hp ?? 100)}" style="width:${p2.hp ?? 100}%"></div></div></div>
        ${state.finished
          ? `<div class="row" style="margin-top:14px;justify-content:center;"><span class="badge badge-win">🏆 ${escapeHtml(state.winnerName || '')} gagne</span></div>`
          : `<button class="btn btn-primary btn-block" style="margin-top:16px;" data-action="attack" ${canAttack ? '' : 'disabled'}>${canAttack ? '⚔️ Attaquer' : (role ? 'Ce n\'est pas ton tour' : 'Spectateur')}</button>`}
        <div class="log">${log}</div>
      </div>`;
    },

    // .pendu
    hangman(state, { role }) {
      const canPlay = role && role !== 'spectator' && !state.finished;
      const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
      const used = new Set(state.guessed || []);
      const grid = letters.map(l => `<button class="btn" data-action="letter" data-value="${l}" ${!canPlay || used.has(l) ? 'disabled' : ''}>${l.toUpperCase()}</button>`).join('');
      return `<div class="card">
        <h1>🪢 Pendu</h1>
        <div class="hangman-word">${escapeHtml(state.masked || '')}</div>
        <div class="hangman-tries">Essais restants : ${state.triesLeft ?? '?'}</div>
        ${state.finished ? `<div class="row" style="justify-content:center;"><span class="badge ${state.won ? 'badge-win' : 'badge-lose'}">${state.won ? '🎉 Gagné' : '💀 Perdu — mot : ' + escapeHtml(state.word || '')}</span></div>` : `<div class="btn-grid">${grid}</div>`}
      </div>`;
    },

    // .guess
    numberguess(state, { role }) {
      const canPlay = role && role !== 'spectator' && !state.finished;
      return `<div class="card">
        <h1>🔢 Devine le nombre</h1>
        <h2>1 à 100 — Essais : ${state.tries ?? 0}</h2>
        ${state.hint ? `<div class="row" style="margin-bottom:10px;"><span class="badge">${escapeHtml(state.hint)}</span></div>` : ''}
        ${state.finished
          ? `<div class="row" style="justify-content:center;"><span class="badge badge-win">🎯 Trouvé : ${state.target}</span></div>`
          : `<input type="number" id="guessInput" min="1" max="100" placeholder="Ton nombre..." />
             <button class="btn btn-primary btn-block" data-action="guess" data-input="#guessInput" ${canPlay ? '' : 'disabled'}>Proposer</button>`}
      </div>`;
    },

    // .riddle, .puzzle, .trivia, .motmystere
    answer(state, { role }) {
      const canPlay = role && role !== 'spectator' && !state.finished && !state.readOnly;
      const log = (state.log || []).length
        ? `<div class="log">${state.log.map(l => `<div class="log-entry mono">${escapeHtml(l)}</div>`).join('')}</div>` : '';
      return `<div class="card">
        <h1>❓ ${escapeHtml(state.title || 'Énigme')}</h1>
        <h2>${escapeHtml(state.question || '')}</h2>
        ${log}
        ${state.finished
          ? `<div class="row" style="justify-content:center;margin-top:10px;"><span class="badge ${state.correct ? 'badge-win' : 'badge-lose'}">${state.correct ? '✅ Bonne réponse' : '❌ Raté — réponse : ' + escapeHtml(state.answer || '')}</span></div>`
          : state.readOnly
            ? `<div class="row muted" style="margin-top:10px;">Réponds directement dans le chat WhatsApp.</div>`
            : `<input type="text" id="ansInput" placeholder="Ta réponse..." />
               <button class="btn btn-primary btn-block" data-action="answer" data-input="#ansInput" ${canPlay ? '' : 'disabled'}>Valider</button>`}
      </div>`;
    },

    // .sondage, .wyr
    poll(state, { role }) {
      const total = (state.options || []).reduce((s, o) => s + (o.votes || 0), 0) || 1;
      const opts = (state.options || []).map((o, i) => {
        const pct = Math.round(((o.votes || 0) / total) * 100);
        return `<div class="poll-option">
          <button class="btn" data-action="vote" data-value="${i}" ${role === 'spectator' ? 'disabled' : ''}>${escapeHtml(o.label)}</button>
          <div class="poll-bar-track"><div class="poll-bar-fill" style="width:${pct}%"></div></div>
          <span class="mono tiny">${pct}%</span>
        </div>`;
      }).join('');
      return `<div class="card">
        <h1>🗳️ ${escapeHtml(state.question || 'Sondage')}</h1>
        <h2>${total > 1 ? total : 0} vote(s)</h2>
        ${opts}
      </div>`;
    },

    // .dare, .truth
    truthdare(state, { role }) {
      return `<div class="card">
        <h1>${state.mode === 'dare' ? '🔥 Action' : '💭 Vérité'}</h1>
        <h2 style="font-size:16px;color:var(--text);">${escapeHtml(state.text || '')}</h2>
        <button class="btn btn-primary btn-block" style="margin-top:14px;" data-action="reroll" ${role === 'spectator' ? 'disabled' : ''}>🔄 Une autre</button>
      </div>`;
    },

    // .cartes, .pack
    cards(state) {
      const cards = (state.cards || []).map(c => `<div class="log-entry">${escapeHtml(c.emoji || '🃏')} ${escapeHtml(c.name)} <span class="muted">${escapeHtml(c.rarity || '')}</span></div>`).join('');
      return `<div class="card">
        <h1>🃏 ${escapeHtml(state.title || 'Collection')}</h1>
        <h2>${(state.cards || []).length} carte(s)</h2>
        <div class="log">${cards}</div>
      </div>`;
    },

    // .spy — vue par rôle (le state envoyé est déjà filtré côté serveur selon le rôle)
    spy(state) {
      return `<div class="card">
        <h1>🕵️ Spyfall</h1>
        ${state.isSpy ? `<h2>Tu es <b style="color:var(--red)">L'ESPION</b>. Découvre le lieu sans te faire griller.</h2>`
          : `<h2>📍 Lieu : <b>${escapeHtml(state.location || '?')}</b></h2>`}
        ${state.revealed ? `<div class="row" style="margin-top:12px;"><span class="badge">🎭 Espion : ${escapeHtml(state.spyName || '?')} — Lieu : ${escapeHtml(state.location || '?')}</span></div>` : ''}
      </div>`;
    }
  };
})();
