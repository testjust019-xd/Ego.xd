/**
 * gameWeb.js — API utilisée par les commandes (commands/games/*.js) pour
 * exposer une version web (visuelle / interactive / live) d'une partie.
 *
 * Utilisation typique dans une commande :
 *
 *   const { createGameLink, updateGame } = require('../../helpers/gameWeb');
 *
 *   const { links } = createGameLink({
 *     type: 'race',
 *     state: { field, stake },
 *     minRank: 'E',                 // même verrou que la commande WhatsApp
 *     players: [{ jid: senderJid, role: 'p1' }],
 *   });
 *   await replyText(sock, jid, `🏁 Résultat : ${links.p1}`, msg);
 *
 * Pour du multijoueur avec rôles secrets, envoyer chaque lien en DM (comme
 * spy.js le fait déjà pour les rôles), et proposer un lien "spectator" en
 * lecture seule pour le reste du groupe.
 */
const crypto = require('crypto');
let config = {};
try { config = require('../config'); } catch (_) {}

const webViews = require('../lib/webViews');
const webAuth = require('../lib/webAuth');
const { meetsRank, getUserRank } = require('../lib/rankGate');
const { log } = require('../lib/logger');
const rateLimit = require('../lib/rateLimit');

function newId() {
  return crypto.randomBytes(6).toString('hex');
}

function baseUrl() {
  return (process.env.PUBLIC_URL || config.publicUrl || '').replace(/\/$/, '');
}

/**
 * Crée une partie web + les liens pour chaque joueur (et un lien spectateur).
 * chatJid (optionnel) : jid du groupe/chat d'origine, utilisé pour l'historique.
 * @returns {{ gameId: string, links: Record<string,string> }}
 */
function createGameLink({ type, state = {}, meta = {}, minRank = null, players = [], spectator = true, open = false, chatJid = null, onAction = null, filterState = null, ttlMs = 30 * 60 * 1000 }) {
  const gameId = newId();
  // open: true => n'importe qui avec le lien peut agir (ex: .sondage, .wyr en groupe),
  // sans JID personnel associé — pas de vérif de rang possible dans ce cas.
  // filterState: (state, {role, jid}) => state visible par CE joueur (ex: .spy)
  webViews.create(gameId, {
    type,
    state,
    meta: { ...meta, minRank, open, chatJid, playerJids: players.map(p => p.jid).filter(Boolean) },
    onAction,
    filterState,
    ttlMs
  });
  log.game.info('link', type, 'gid=' + gameId.slice(0, 8), 'players=' + players.length);

  const b = baseUrl();
  if (!b) {
    console.warn('[gameWeb] PUBLIC_URL non défini → les liens jeux seront incomplets. Mets PUBLIC_URL=https://ton-domaine');
  }
  const links = {};

  players.forEach((p, i) => {
    const token = webAuth.sign({ gid: gameId, jid: p.jid || null, role: p.role || `p${i + 1}`, exp: Date.now() + ttlMs });
    links[p.role || `p${i + 1}`] = b ? `${b}/g/${token}` : `(configure PUBLIC_URL)/g/${token}`;
  });

  if (open) {
    const token = webAuth.sign({ gid: gameId, jid: null, role: 'voter', exp: Date.now() + ttlMs });
    links.open = b ? `${b}/g/${token}` : `(configure PUBLIC_URL)/g/${token}`;
  }

  if (spectator) {
    const token = webAuth.sign({ gid: gameId, jid: null, role: 'spectator', exp: Date.now() + ttlMs });
    links.spectator = b ? `${b}/g/${token}` : `(configure PUBLIC_URL)/g/${token}`;
  }

  return { gameId, links };
}

/** Met à jour le state d'une partie existante (diffusé en live aux gens connectés) */
function updateGame(gameId, patch, ttlMs) {
  return webViews.update(gameId, patch, ttlMs);
}

function closeGame(gameId) {
  webViews.remove(gameId);
}

/**
 * Vérifie qu'un token permet bien d'agir sur une partie (utilisé par la
 * route POST /api/g/:token/action dans start.js). Revérifie le rang au
 * moment de l'action, pas seulement à la création du lien.
 */
function canAct(token) {
  const payload = webAuth.verify(token);
  if (!payload) return { ok: false, error: 'Lien invalide ou expiré.' };

  const view = webViews.get(payload.gid);
  if (!view) return { ok: false, error: 'Partie terminée ou introuvable.' };

  if (payload.role === 'spectator') {
    return { ok: false, error: 'Ce lien est en lecture seule.' };
  }
  if (!payload.jid && !view.meta?.open) {
    return { ok: false, error: 'Ce lien est en lecture seule.' };
  }

  // Anti-spam : limite les actions par joueur+partie (protège aussi le bot WhatsApp
  // en aval, puisque certaines actions déclenchent des sendMessage).
  const rl = rateLimit.check(
    `game-action:${payload.jid || payload.role}:${payload.gid}`,
    config.webGames?.actionMaxPerWindow || 30,
    config.webGames?.actionWindowMs || 60 * 1000
  );
  if (!rl.ok) {
    return { ok: false, error: `Trop d'actions, réessaie dans ${rl.waitSec}s.` };
  }

  if (view.meta?.minRank && payload.jid) {
    const rank = getUserRank(payload.jid);
    if (!meetsRank(rank, view.meta.minRank)) {
      return { ok: false, error: `Rang ${view.meta.minRank}+ requis pour agir (ton rang a peut-être changé).` };
    }
  }

  return { ok: true, payload, view };
}

/** Vérifie un token pour la simple lecture (state / page) — pas de check de rang */
function canView(token) {
  const payload = webAuth.verify(token);
  if (!payload) return { ok: false, error: 'Lien invalide ou expiré.' };
  const view = webViews.get(payload.gid);
  if (!view) return { ok: false, error: 'Partie terminée ou introuvable.' };
  return { ok: true, payload, view };
}

/** Applique le filterState (si défini) pour renvoyer ce que CE rôle/jid a le droit de voir */
function viewStateFor(view, { role, jid }) {
  if (typeof view.filterState === 'function') {
    try { return view.filterState(view.state, { role, jid }); } catch { return view.state; }
  }
  return view.state;
}

/** Callback optionnel (défini par start.js au démarrage) : (jid, text) => void */
let notifyFn = null;
function setNotifyFn(fn) { notifyFn = fn; }

/** Notifie le chat WhatsApp d'origine (si activé dans config.webGames) qu'une action web a eu lieu */
function notifyChat(gameId, text) {
  if (!config.webGames?.notifyChatOnWebAction) return;
  const view = webViews.get(gameId);
  const chatJid = view?.meta?.chatJid;
  if (chatJid && typeof notifyFn === 'function') {
    try { notifyFn(chatJid, text); } catch (e) { log.game.warn('notifyChat', e.message); }
  }
}

module.exports = { createGameLink, updateGame, closeGame, canAct, canView, viewStateFor, setNotifyFn, notifyChat, newId, baseUrl };
