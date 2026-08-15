/**
 * webViews.js — Store en mémoire des "vues web" de jeux/commandes.
 * Chaque partie a un gameId, un type (utilisé par le front pour choisir
 * le bon rendu) et un state arbitraire. Un bus d'événements permet à
 * start.js de relayer les mises à jour en WebSocket (voir onAnyUpdate).
 *
 * Quand une partie passe à state.finished === true, elle est
 * automatiquement journalisée dans gameHistory (une seule fois).
 */
const EventEmitter = require('events');
const { log } = require('./logger');
const gameHistory = require('./gameHistory');

const bus = new EventEmitter();
bus.setMaxListeners(0);

const views = new Map(); // gameId -> { type, state, meta, expiresAt }

function create(gameId, { type, state = {}, meta = {}, onAction = null, filterState = null, ttlMs = 30 * 60 * 1000 }) {
  // onAction (optionnel) : async ({ role, jid, action, data }) => résultat
  // filterState (optionnel) : (state, { role, jid }) => state visible par CE joueur
  //   (ex: .spy — l'espion ne voit pas le lieu). Reste en mémoire, non sérialisé.
  const v = { type, state, meta, onAction, filterState, expiresAt: Date.now() + ttlMs, _historyLogged: false };
  views.set(gameId, v);
  log.game.info('create', type, gameId.slice(0, 8));
  return v;
}

function get(gameId) {
  const v = views.get(gameId);
  if (!v) return null;
  if (Date.now() > v.expiresAt) {
    views.delete(gameId);
    bus.emit('closed', gameId);
    return null;
  }
  return v;
}

function maybeLogHistory(gameId, v) {
  if (v.state && v.state.finished && !v._historyLogged) {
    v._historyLogged = true;
    try {
      gameHistory.push({
        type: v.type,
        jid: v.meta?.chatJid || null,
        players: (v.meta?.playerJids || []),
        summary: v.state.resultText || v.state.winnerName || v.type,
        meta: { gameId: gameId.slice(0, 8) }
      });
    } catch (e) {
      log.game.warn('history', e.message);
    }
  }
}

/**
 * Met à jour le state d'une partie.
 * patch peut être un objet (merge superficiel) ou une fonction (state) => nouveauState
 */
function update(gameId, patch, ttlMs) {
  const v = get(gameId);
  if (!v) return null;
  v.state = typeof patch === 'function' ? patch(v.state) : { ...v.state, ...patch };
  if (ttlMs) v.expiresAt = Date.now() + ttlMs;
  maybeLogHistory(gameId, v);
  bus.emit('update', gameId, v.state, v.type);
  return v;
}

function remove(gameId) {
  views.delete(gameId);
  bus.emit('closed', gameId);
}

/** S'abonne à TOUTES les mises à jour (start.js s'en sert pour le relais socket.io) */
function onAnyUpdate(fn) {
  bus.on('update', fn);
  return () => bus.off('update', fn);
}

function onAnyClose(fn) {
  bus.on('closed', fn);
  return () => bus.off('closed', fn);
}

/** Nombre de parties actives (pour /health, /api/admin/stats) */
function activeCount() {
  return views.size;
}

// Nettoyage périodique des parties expirées
setInterval(() => {
  const now = Date.now();
  for (const [id, v] of views) {
    if (now > v.expiresAt) {
      views.delete(id);
      bus.emit('closed', id);
    }
  }
}, 60_000).unref();

module.exports = { create, get, update, remove, onAnyUpdate, onAnyClose, activeCount };
