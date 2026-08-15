/**
 * webAuth.js — Tokens signés pour les liens de jeu (.course, .duel, etc.)
 *
 * Chaque lien envoyé à un joueur contient un token qui encode :
 *  - gid  : id de la partie (webViews)
 *  - jid  : le WhatsApp JID du joueur autorisé à agir avec ce lien (null = spectateur)
 *  - role : rôle dans la partie ('p1', 'p2', 'spectator', ...)
 *  - exp  : expiration
 *
 * Le token est un HMAC signé côté serveur : personne ne peut le fabriquer
 * ou le modifier sans connaître WEB_TOKEN_SECRET. Comme il n'y a pas de
 * vrai login web, la sécurité repose sur : (1) le lien n'est envoyé qu'au
 * bon joueur (DM privé pour les rôles sensibles, comme .spy le fait déjà
 * pour les rôles), et (2) la vérification du rang au moment de l'action.
 */
const crypto = require('crypto');

let config = {};
try { config = require('../config'); } catch (_) {}

const SECRET = process.env.WEB_TOKEN_SECRET || config.webTokenSecret || 'ego-xd-dev-secret-change-me';

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function sign(payload) {
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const sig = b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
  return `${body}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
  // comparaison à temps constant
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const json = Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    const payload = JSON.parse(json);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

module.exports = { sign, verify };
