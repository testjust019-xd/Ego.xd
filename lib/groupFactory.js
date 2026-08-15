/**
 * Group Factory — .creategroup / .getgroup
 * - Création premium
 * - File d'ajout étalée ~24 h
 * - Créateur ajouté admin UNIQUEMENT à la fin
 * - Message épinglé "en construction"
 */
const peopleDB = require('./peopleDB');
const groupsDB = require('./groupsDB');

const PIN_TEXT =
  `⚙️ *SYSTEM — GROUP FACTORY*\n\n` +
  `Ce groupe est *en cours de création*.\n` +
  `Il ne sera réellement ouvert qu'à la *fin* du processus (~24 h).\n\n` +
  `Merci de *ne pas quitter*.\n` +
  `Les départs pendant la phase de construction peuvent être considérés comme un abandon.\n\n` +
  `— EGO.XD`;

const OPEN_TEXT =
  `✅ *SYSTEM — GROUPE OUVERT*\n\n` +
  `La construction est terminée.\n` +
  `Le fondateur a rejoint en tant qu'admin.\n` +
  `Bienvenue.\n\n— EGO.XD`;

/** sock principal (session main) — injecté au démarrage */
let mainSock = null;
let hubIo = null;
let workerStarted = false;

function setMainSock(sock) {
  mainSock = sock;
}

function setHubIo(io) {
  hubIo = io;
}

function emitFactoryProgress(payload) {
  if (!hubIo) return;
  try {
    hubIo.to('factory').emit('factory:progress', payload);
    if (payload.groupId) hubIo.to('factory:' + payload.groupId).emit('factory:progress', payload);
    if (payload.code) hubIo.to('factory:' + payload.code).emit('factory:progress', payload);
  } catch (e) {
    console.warn('[groupFactory] emit', e.message);
  }
}

function getSock() {
  return mainSock;
}

function progressBar(done, total, width = 12) {
  const t = Math.max(1, total);
  const filled = Math.round((done / t) * width);
  return '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled));
}

async function safeAdd(sock, groupJid, jids) {
  if (!jids.length) return { ok: [], fail: [] };
  const ok = [];
  const fail = [];
  try {
    await sock.groupParticipantsUpdate(groupJid, jids, 'add');
    ok.push(...jids);
  } catch (err) {
    // certains numéros refusent l'ajout direct → on tente un par un
    for (const j of jids) {
      try {
        await sock.groupParticipantsUpdate(groupJid, [j], 'add');
        ok.push(j);
        await sleep(1500);
      } catch (e) {
        fail.push(j);
        console.warn('[groupFactory] add fail', j, e.message);
      }
    }
  }
  return { ok, fail };
}

async function safePromote(sock, groupJid, jids) {
  try {
    await sock.groupParticipantsUpdate(groupJid, jids, 'promote');
    return true;
  } catch (e) {
    console.warn('[groupFactory] promote', e.message);
    return false;
  }
}

async function tryPin(sock, groupJid, msgKey) {
  if (!msgKey) return false;
  try {
    // Baileys / variants : pin message (si supporté)
    if (typeof sock.pinMsg === 'function') {
      await sock.pinMsg(groupJid, msgKey, true);
      return true;
    }
    await sock.sendMessage(groupJid, {
      pin: {
        key: msgKey,
        type: 1,
        time: 86400 * 7
      }
    });
    return true;
  } catch (e) {
    console.warn('[groupFactory] pin non supporté, fallback description:', e.message);
    try {
      await sock.groupUpdateDescription(
        groupJid,
        '⚙️ EN CONSTRUCTION — ouverture à la fin du process. Merci de rester.'
      );
    } catch (_) {}
    return false;
  }
}

async function tryUnpin(sock, groupJid, msgKey) {
  if (!msgKey) return;
  try {
    if (typeof sock.pinMsg === 'function') {
      await sock.pinMsg(groupJid, msgKey, false);
      return;
    }
    await sock.sendMessage(groupJid, {
      pin: { key: msgKey, type: 0, time: 0 }
    });
  } catch (_) {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Crée le groupe premium (vide de membres pool), setup, pin, job optionnel.
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} opts.creatorJid
 * @param {string[]} opts.queueJids - membres à ajouter sur 24h (getgroup)
 * @param {string[]} opts.immediateJids - ajoutés tout de suite (creategroup manuel, hors créateur)
 * @param {object} opts.filters
 * @param {string} opts.source
 * @param {number} opts.durationMs - durée totale de la file (défaut 24h)
 * @param {boolean} opts.deferCreator - si true, créateur seulement à la fin (défaut true pour getgroup)
 */
async function createPremiumGroup(opts) {
  const sock = getSock();
  if (!sock) throw new Error('Bot non connecté (sock principal manquant).');

  const name = String(opts.name || 'EGO Group').slice(0, 60);
  const creatorJid = peopleDB.normalizeJid(opts.creatorJid);
  const queueJids = (opts.queueJids || []).map(peopleDB.normalizeJid).filter(Boolean);
  const immediateJids = (opts.immediateJids || [])
    .map(peopleDB.normalizeJid)
    .filter((j) => j && j !== creatorJid);
  const deferCreator = opts.deferCreator !== false;
  const durationMs = opts.durationMs || 24 * 60 * 60 * 1000;
  const source = opts.source || 'getgroup';

  // 1. Créer le groupe (participants vides → bot seul)
  let meta;
  try {
    meta = await sock.groupCreate(name, []);
  } catch (e) {
    // certaines versions exigent au moins un participant : on met le bot lui-même si possible
    const botJid = peopleDB.normalizeJid(sock.user?.id);
    meta = await sock.groupCreate(name, botJid ? [botJid] : []);
  }
  const waJid = meta.id || meta.gid || meta;
  if (!waJid || typeof waJid !== 'string') {
    throw new Error('groupCreate n\'a pas renvoyé d\'id de groupe.');
  }

  // 2. Description
  try {
    await sock.groupUpdateDescription(
      waJid,
      '⚙️ EN CONSTRUCTION — ouverture à la fin du process. Merci de rester. | EGO.XD'
    );
  } catch (_) {}

  // 3. Message pin "en construction"
  let pinMsgKey = null;
  try {
    const pinMsg = await sock.sendMessage(waJid, { text: PIN_TEXT });
    pinMsgKey = pinMsg?.key || null;
    await tryPin(sock, waJid, pinMsgKey);
  } catch (e) {
    console.warn('[groupFactory] pin message', e.message);
  }

  // 4. Ajouts immédiats (creategroup manuel) — PAS le créateur si defer
  const members = [];
  if (immediateJids.length) {
    const { ok } = await safeAdd(sock, waJid, immediateJids.slice(0, 40));
    members.push(...ok);
    for (const j of ok) peopleDB.addGroup(j, waJid);
  }

  // 5. Enregistrement DB
  // timeline seed below after record
  const rec = groupsDB.createGroupRecord({
    waJid,
    name,
    ownerJid: creatorJid,
    source,
    filters: opts.filters || {},
    members,
    pending: queueJids,
    pinMsgKey
  });

  try {
    groupsDB.pushEvent(rec.id, { type: 'created', text: 'Groupe créé — phase construction' });
    groupsDB.pushEvent(rec.id, { type: 'pin', text: 'Message système épinglé' });
  } catch (_) {}

  emitFactoryProgress({
    groupId: rec.id,
    code: rec.inviteCode,
    name: rec.name,
    status: rec.status,
    members: 0,
    pending: queueJids.length,
    progressPct: 0
  });

  // 6. Job 24h si file
  if (queueJids.length) {
    const batchSize = Math.max(1, Math.min(5, opts.batchSize || 2));
    const ticks = Math.ceil(queueJids.length / batchSize);
    const intervalMs = Math.max(5 * 60 * 1000, Math.floor(durationMs / Math.max(1, ticks)));
    groupsDB.createJob(rec.id, {
      creatorJid,
      queue: queueJids,
      intervalMs,
      batchSize
    });
  } else if (!deferCreator) {
    // creategroup sans file : ajouter créateur admin tout de suite
    await finalizeCreator(sock, rec, creatorJid);
  } else if (!queueJids.length && deferCreator) {
    // rien à ajouter mais defer → finaliser quand même
    await finalizeCreator(sock, rec, creatorJid);
  }

  // DM initial
  try {
    const total = queueJids.length;
    let dm =
      `⚙️ *GROUP FACTORY*\n\n` +
      `Groupe : *${name}*\n` +
      `Code : *${rec.inviteCode}*\n` +
      `WA : ${waJid}\n`;
    if (total) {
      dm +=
        `\nFile d'ajout : *${total}* personnes\n` +
        `Rythme : étalé sur ~${Math.round(durationMs / 3600000)} h\n` +
        `Tu seras ajouté *admin à la fin* uniquement.\n` +
        `Tu recevras la progression ici.`;
    } else {
      dm += `\nGroupe prêt (pas de file d'ajout auto).`;
    }
    await sock.sendMessage(creatorJid, { text: dm });
  } catch (e) {
    console.warn('[groupFactory] DM creator', e.message);
  }

  return rec;
}

async function finalizeCreator(sock, rec, creatorJid) {
  const waJid = rec.waJid;
  const { ok } = await safeAdd(sock, waJid, [creatorJid]);
  if (ok.includes(creatorJid) || true) {
    await sleep(1500);
    await safePromote(sock, waJid, [creatorJid]);
  }
  peopleDB.addGroup(creatorJid, rec.id);
  const members = [...new Set([...(rec.members || []), creatorJid])];
  groupsDB.updateGroup(rec.id, {
    members,
    pending: [],
    status: 'open',
    openedAt: Date.now()
  });
  try {
    groupsDB.pushEvent(rec.id, { type: 'opened', text: 'Groupe ouvert — fondateur admin' });
    emitFactoryProgress({
      groupId: rec.id,
      code: rec.inviteCode,
      name: rec.name,
      status: 'open',
      members: members.length,
      pending: 0,
      progressPct: 100
    });
  } catch (_) {}
  try {
    await tryUnpin(sock, waJid, rec.pinMsgKey);
    await sock.sendMessage(waJid, { text: OPEN_TEXT });
    await sock.groupUpdateDescription(
      waJid,
      `✅ Groupe ouvert | Code ${rec.inviteCode} | EGO.XD`
    );
  } catch (_) {}
  try {
    await sock.sendMessage(creatorJid, {
      text:
        `✅ *GROUP FACTORY — TERMINÉ*\n\n` +
        `*${rec.name}* est ouvert.\n` +
        `Tu as été ajouté en *admin*.\n` +
        `Code : *${rec.inviteCode}*`
    });
  } catch (_) {}
}

async function processOneJob(job) {
  const sock = getSock();
  if (!sock) return;
  const rec = groupsDB.getById(job.groupId);
  if (!rec) {
    groupsDB.updateJob(job.groupId, { status: 'dead' });
    return;
  }

  const batch = job.queue.slice(0, job.batchSize || 2);
  if (!batch.length) {
    // fin de file → ajouter le créateur
    await finalizeCreator(sock, rec, job.creatorJid);
    groupsDB.updateJob(job.groupId, { status: 'done', queue: [] });
    return;
  }

  const { ok, fail } = await safeAdd(sock, rec.waJid, batch);
  for (const j of ok) {
    peopleDB.addGroup(j, rec.id);
  }

  const newQueue = job.queue.slice(batch.length);
  const done = [...(job.done || []), ...ok];
  const failed = [...(job.failed || []), ...fail];
  const total = done.length + failed.length + newQueue.length;

  groupsDB.updateGroup(rec.id, {
    members: [...new Set([...(rec.members || []), ...ok])],
    pending: newQueue
  });

  const nextAt = Date.now() + (job.intervalMs || 30 * 60 * 1000);
  groupsDB.updateJob(job.groupId, {
    queue: newQueue,
    done,
    failed,
    nextAt,
    lastProgressAt: Date.now()
  });

  for (const j of ok) {
    try {
      groupsDB.pushEvent(job.groupId, {
        type: 'add',
        jid: j,
        text: 'Membre ajouté ' + String(j).split('@')[0]
      });
    } catch (_) {}
  }

  {
    const doneCount = done.length;
    const target = done.length + failed.length + newQueue.length;
    const pct = Math.round((doneCount / Math.max(1, target)) * 100);
    emitFactoryProgress({
      groupId: job.groupId,
      code: rec.inviteCode,
      name: rec.name,
      status: newQueue.length ? 'building' : 'opening',
      members: doneCount,
      pending: newQueue.length,
      failed: failed.length,
      progressPct: pct,
      bar: progressBar(doneCount, target || 1)
    });
  }

  // Progress DM (max 1 toutes les ~20 min pour pas spammer)
  const shouldDm =
    !job.lastProgressAt || Date.now() - job.lastProgressAt > 15 * 60 * 1000 || newQueue.length === 0;
  if (shouldDm) {
    const doneCount = done.length;
    const target = done.length + failed.length + newQueue.length;
    try {
      await sock.sendMessage(job.creatorJid, {
        text:
          `📊 *${rec.name}* — ${doneCount}/${target || doneCount} ajoutés\n` +
          `${progressBar(doneCount, target || 1)} ` +
          `${Math.round((doneCount / Math.max(1, target)) * 100)} %\n` +
          (newQueue.length
            ? `Restant en file : ${newQueue.length}`
            : `File terminée — ouverture…`)
      });
    } catch (_) {}
  }

  if (!newQueue.length) {
    await finalizeCreator(sock, rec, job.creatorJid);
    groupsDB.updateJob(job.groupId, { status: 'done' });
  }
}

async function tickJobs() {
  const jobs = groupsDB.listRunningJobs();
  const now = Date.now();
  for (const job of jobs) {
    if ((job.nextAt || 0) > now) continue;
    try {
      await processOneJob(job);
    } catch (e) {
      console.error('[groupFactory] job error', job.groupId, e.message);
      groupsDB.updateJob(job.groupId, {
        nextAt: Date.now() + 10 * 60 * 1000
      });
    }
    await sleep(3000);
  }
}

function startWorker() {
  if (workerStarted) return;
  workerStarted = true;
  console.log('[groupFactory] worker démarré (tick 60s)');
  setInterval(() => {
    tickJobs().catch((e) => console.error('[groupFactory] tick', e.message));
  }, 60 * 1000);
  // premier tick après 20s
  setTimeout(() => tickJobs().catch(() => {}), 20000);
}

module.exports = {
  setMainSock,
  setHubIo,
  getSock,
  createPremiumGroup,
  startWorker,
  tickJobs,
  processOneJob,
  PIN_TEXT,
  progressBar,
  emitFactoryProgress
};
