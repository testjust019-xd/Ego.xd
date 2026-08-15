(function () {
  const $ = (id) => document.getElementById(id);
  const TOKEN_KEY = 'ego_hub_token';

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  }

  function fmtUptime(s) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 24) return Math.floor(h / 24) + 'j ' + (h % 24) + 'h';
    return h + 'h ' + m + 'm';
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }
  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  }

  // Socket.IO factory live
  let socket;
  try {
    socket = io({ path: '/socket.io' });
    socket.on('connect', () => {
      socket.emit('hub:join', 'factory');
      $('live').textContent = '● LIVE';
      $('live').classList.add('on');
    });
    socket.on('disconnect', () => {
      $('live').textContent = '● …';
      $('live').classList.remove('on');
    });
    socket.on('factory:progress', (p) => {
      $('live-factory').textContent = 'update ' + (p.code || '');
      if (p.code && $('code-input').value.toUpperCase() === String(p.code).toUpperCase()) {
        loadGroup(p.code);
      }
      loadGroups();
      loadOverview();
    });
  } catch (e) {
    console.warn('socket', e);
  }

  async function loadOverview() {
    const res = await fetch('/api/hub/overview');
    const d = await res.json();
    $('s-pool').textContent = d.pool?.optIn ?? 0;
    $('s-groups').textContent = d.factory?.groupsTotal ?? 0;
    $('s-building').textContent = d.factory?.building ?? 0;
    $('s-uptime').textContent = fmtUptime(d.uptime || 0);
  }

  async function loadGroups() {
    const res = await fetch('/api/hub/groups?limit=12');
    const d = await res.json();
    const el = $('groups-list');
    if (!d.groups?.length) {
      el.innerHTML = '<div class="muted mono tiny">Aucun groupe.</div>';
      return;
    }
    el.innerHTML = d.groups
      .map(
        (g) => `
      <div class="row" data-code="${g.code}">
        <div class="name">${escapeHtml(g.name)}</div>
        <span class="badge ${g.status}">${g.status}</span>
        <span class="mono tiny muted">${g.members}${g.pending ? '+' + g.pending : ''}</span>
        <span class="mono tiny">${g.code}</span>
      </div>`
      )
      .join('');
    el.querySelectorAll('.row').forEach((row) => {
      row.addEventListener('click', () => {
        $('code-input').value = row.dataset.code;
        loadGroup(row.dataset.code);
        if (socket) socket.emit('hub:join', 'factory:' + row.dataset.code);
      });
    });
  }

  async function loadPool() {
    const res = await fetch('/api/hub/pool');
    const d = await res.json();
    const el = $('tags');
    if (!d.tags?.length) {
      el.innerHTML = '<span class="muted mono tiny">Pas de tags</span>';
      return;
    }
    el.innerHTML = d.tags
      .map((t) => `<span class="tag">${escapeHtml(t.tag)} <b>${t.count}</b></span>`)
      .join('');
  }

  async function loadTop() {
    const res = await fetch('/api/hub/top?limit=8');
    const d = await res.json();
    const el = $('top');
    if (!d.top?.length) {
      el.innerHTML = '<div class="muted mono tiny">—</div>';
      return;
    }
    el.innerHTML = d.top
      .map(
        (u) => `
      <div class="row" style="cursor:default">
        <span class="mono tiny">#${u.rank}</span>
        <div class="name">${escapeHtml(u.jid)}</div>
        <span class="badge open">${escapeHtml(u.hunterRank)}</span>
        <span class="mono tiny muted">${u.balance}</span>
      </div>`
      )
      .join('');
  }

  async function loadGroup(code) {
    const box = $('group-detail');
    box.classList.remove('hidden');
    box.innerHTML = 'Chargement…';
    try {
      const res = await fetch('/api/hub/group/' + encodeURIComponent(code));
      const d = await res.json();
      if (d.error) {
        box.innerHTML = '<span style="color:var(--bad)">' + escapeHtml(d.error) + '</span>';
        return;
      }
      if (socket) socket.emit('hub:join', 'factory:' + d.code);

      const roster = (d.roster || [])
        .map(
          (m) =>
            `<div class="row" style="cursor:default"><div class="name">${escapeHtml(m.jid)}</div>
             <span class="badge open">${escapeHtml(m.rank)}</span>
             <span class="mono tiny muted">${(m.tags || []).join(',') || '—'}</span></div>`
        )
        .join('') || '<div class="mono tiny muted">Roster vide (encore en file)</div>';

      const timeline = (d.timeline || [])
        .map(
          (e) =>
            `<div class="mono tiny muted">${new Date(e.at).toLocaleString('fr-FR')} — ${escapeHtml(
              e.text || e.type
            )}</div>`
        )
        .join('') || '<div class="mono tiny muted">Pas d’événements</div>';

      box.innerHTML = `
        <div><strong>${escapeHtml(d.name)}</strong> · <span class="badge ${d.status}">${d.status}</span>
          ${d.jobStatus ? '· job ' + escapeHtml(d.jobStatus) : ''}</div>
        <div class="mono tiny muted">Code ${escapeHtml(d.code)} · ${escapeHtml(d.source || '')}</div>
        <div class="bar">${escapeHtml(d.bar || '')} ${d.progressPct || 0}%</div>
        <div>Membres <b>${d.members}</b> · file <b>${d.pending}</b> · fail <b>${d.failed || 0}</b></div>
        <div style="margin-top:12px"><strong>Roster</strong></div>
        <div class="list">${roster}</div>
        <div style="margin-top:12px"><strong>Timeline</strong></div>
        <div>${timeline}</div>
        <div class="mono tiny muted" style="margin-top:8px">.groupinfo ${escapeHtml(d.code)} · .joingrouproup ${escapeHtml(d.code)}</div>
      `;
      history.replaceState(null, '', '/group/' + encodeURIComponent(d.code));
    } catch (e) {
      box.innerHTML = '<span style="color:var(--bad)">' + escapeHtml(e.message) + '</span>';
    }
  }

  async function loadMe() {
    const token = getToken();
    if (!token) {
      $('login-box').classList.remove('hidden');
      $('me-box').classList.add('hidden');
      return;
    }
    const res = await fetch('/api/hub/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!res.ok) {
      setToken('');
      $('login-box').classList.remove('hidden');
      $('me-box').classList.add('hidden');
      return;
    }
    const d = await res.json();
    $('login-box').classList.add('hidden');
    $('me-box').classList.remove('hidden');
    const groups =
      (d.groups || [])
        .map(
          (g) =>
            `<div class="row" data-code="${g.code}"><div class="name">${escapeHtml(g.name)}</div>
             <span class="badge ${g.status}">${g.status}</span>
             <span class="mono tiny">${g.role}</span>
             <span class="mono tiny">${g.code}</span></div>`
        )
        .join('') || '<div class="mono tiny muted">Aucun groupe lié</div>';
    $('me-box').innerHTML = `
      <div><strong>${escapeHtml(d.display)}</strong> · <span class="badge open">${escapeHtml(d.rank)}</span></div>
      <div class="mono tiny muted">Pool : ${d.optIn ? 'opt-in' : 'opt-out'} · tags : ${(d.tags || []).join(', ') || '—'}</div>
      <div style="margin-top:12px" id="card-preview">
        <strong>System Card</strong>
        <div class="mono tiny muted">WhatsApp : .card · image ci-dessous si login</div>
        <img id="card-svg" alt="card" style="width:100%;max-width:420px;margin-top:8px;border-radius:12px;border:1px solid var(--border);background:#0b0b14" />
      </div>
      <div style="margin-top:10px"><strong>Mes groupes</strong></div>
      <div class="list" id="my-groups">${groups}</div>
      <button type="button" class="btn" id="logout-btn" style="margin-top:10px">Déconnexion</button>
    `;
    const img = $('card-svg');
    if (img) {
      img.src = '/api/hub/card.svg?token=' + encodeURIComponent(token);
      img.onerror = () => { img.style.display = 'none'; };
    }
    $('logout-btn').onclick = () => {
      setToken('');
      loadMe();
    };
    $('me-box').querySelectorAll('[data-code]').forEach((row) => {
      row.addEventListener('click', () => {
        $('code-input').value = row.dataset.code;
        loadGroup(row.dataset.code);
      });
    });
  }

  $('login-request').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = $('login-phone').value.replace(/\D/g, '');
    $('login-hint').textContent = 'Envoi…';
    try {
      const res = await fetch('/api/hub/login/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      $('login-hint').textContent = 'Code envoyé sur WhatsApp. Valable quelques minutes.';
    } catch (err) {
      $('login-hint').textContent = err.message;
    }
  });

  $('login-verify').addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = $('login-phone').value.replace(/\D/g, '');
    const code = $('login-code').value.trim();
    try {
      const res = await fetch('/api/hub/login/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code })
      });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      setToken(d.token);
      $('login-hint').textContent = 'Connecté.';
      loadMe();
    } catch (err) {
      $('login-hint').textContent = err.message;
    }
  });

  $('lookup-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('code-input').value.trim().toUpperCase();
    if (code) loadGroup(code);
  });

  $('staff-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = $('staff-token').value.trim();
    localStorage.setItem('ego_staff_token', token);
    await loadStaffJobs(token);
  });

  async function loadStaffJobs(token) {
    const el = $('staff-jobs');
    el.innerHTML = '…';
    try {
      const res = await fetch('/api/hub/staff/jobs?token=' + encodeURIComponent(token));
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      if (!d.jobs?.length) {
        el.innerHTML = '<div class="mono tiny muted">Aucun job</div>';
        return;
      }
      el.innerHTML = d.jobs
        .map(
          (j) => `
        <div class="row" style="flex-wrap:wrap">
          <div class="name mono tiny">${escapeHtml(j.groupId)}</div>
          <span class="badge ${j.status === 'running' ? 'building' : 'open'}">${escapeHtml(j.status)}</span>
          <span class="mono tiny muted">q${j.queue} d${j.done} f${j.failed}</span>
          <button type="button" class="btn staff-force" data-id="${j.groupId}">Force</button>
          <button type="button" class="btn staff-pause" data-id="${j.groupId}" style="background:#444">Pause</button>
          <button type="button" class="btn staff-resume" data-id="${j.groupId}" style="background:#065f46">Resume</button>
        </div>`
        )
        .join('');
      const tok = token;
      el.querySelectorAll('.staff-force').forEach((b) =>
        b.addEventListener('click', () => staffAction(tok, b.dataset.id, 'force'))
      );
      el.querySelectorAll('.staff-pause').forEach((b) =>
        b.addEventListener('click', () => staffAction(tok, b.dataset.id, 'pause'))
      );
      el.querySelectorAll('.staff-resume').forEach((b) =>
        b.addEventListener('click', () => staffAction(tok, b.dataset.id, 'resume'))
      );
    } catch (e) {
      el.innerHTML = '<span style="color:var(--bad)">' + escapeHtml(e.message) + '</span>';
    }
  }

  async function staffAction(token, id, action) {
    const res = await fetch('/api/hub/staff/job/' + encodeURIComponent(id) + '/' + action, {
      method: 'POST',
      headers: { 'x-admin-token': token }
    });
    const d = await res.json();
    if (d.error) alert(d.error);
    else await loadStaffJobs(token);
  }

  // deep link
  const m = (location.pathname || '').match(/\/group\/([^/]+)/i);
  if (m) {
    $('code-input').value = decodeURIComponent(m[1]).toUpperCase();
    loadGroup($('code-input').value);
  }

  const savedStaff = localStorage.getItem('ego_staff_token');
  if (savedStaff) {
    $('staff-token').value = savedStaff;
  }

  async function refresh() {
    try {
      await Promise.all([loadOverview(), loadGroups(), loadPool(), loadTop(), loadMe()]);
    } catch (e) {
      console.warn(e);
    }
  }
  refresh();
  setInterval(refresh, 30000);
})();
