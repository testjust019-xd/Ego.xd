/**
 * Utilitaires expéditeur / owner
 * Gère le piège LID (@lid) vs numéro téléphone (@s.whatsapp.net)
 */

/**
 * JID de la personne qui a vraiment envoyé le message.
 */
function getSenderJid(sock, msg) {
  if (msg.key.fromMe) {
    const rawId = String(sock.user?.id || '').split(':')[0];
    return rawId.includes('@') ? rawId : `${rawId}@s.whatsapp.net`;
  }
  // Groupe : participant ; PV : remoteJid
  // Préférer participantAlt / remoteJidAlt si présents (mapping LID ↔ PN)
  const key = msg.key || {};
  return (
    key.participantPn ||
    key.participantAlt ||
    key.participant ||
    key.remoteJidAlt ||
    key.remoteJid
  );
}

/** Chiffres uniquement (sans device :XX) */
function digitsOnly(jidOrNum) {
  return String(jidOrNum || '')
    .split(':')[0]
    .replace(/@.*$/, '')
    .replace(/[^0-9]/g, '');
}

/**
 * Tous les identifiants "owner" reconnus :
 * - config.ownerNumbers
 * - numéro du compte bot (sock.user.id)
 * - LID du compte bot (sock.user.lid) si dispo
 */
function getOwnerIdSet(sock) {
  const set = new Set();
  const { ownerNumbers = [] } = require('../config');
  for (const n of ownerNumbers) {
    const d = digitsOnly(n);
    if (d) set.add(d);
  }
  if (sock?.user?.id) {
    const d = digitsOnly(sock.user.id);
    if (d) set.add(d);
  }
  if (sock?.user?.lid) {
    const d = digitsOnly(sock.user.lid);
    if (d) set.add(d);
  }
  return set;
}

/**
 * True si le message vient du owner (compte bot ou numéros listés).
 * @param {object} msg
 * @param {object} [sock]  recommandé en groupe pour résoudre LID/PN
 */
function isOwnerMessage(msg, sock) {
  if (msg?.key?.fromMe) return true;

  const owners = getOwnerIdSet(sock);
  if (!owners.size) return false;

  // Tester plusieurs formes possibles du sender
  const candidates = [
    msg.key?.participantPn,
    msg.key?.participantAlt,
    msg.key?.participant,
    msg.key?.remoteJidAlt,
    msg.key?.remoteJid,
    sock ? getSenderJid(sock, msg) : null
  ];

  for (const c of candidates) {
    const d = digitsOnly(c);
    if (d && owners.has(d)) return true;
  }
  return false;
}

function isStaffMessage(msg, sock) {
  if (isOwnerMessage(msg, sock)) return true;
  const { staffNumbers = [] } = require('../config');
  const staff = new Set(staffNumbers.map(digitsOnly).filter(Boolean));
  const candidates = [
    msg.key?.participantPn,
    msg.key?.participantAlt,
    msg.key?.participant,
    msg.key?.remoteJidAlt,
    msg.key?.remoteJid
  ];
  for (const c of candidates) {
    const d = digitsOnly(c);
    if (d && staff.has(d)) return true;
  }
  return false;
}

module.exports = {
  getSenderJid,
  digitsOnly,
  getOwnerIdSet,
  isOwnerMessage,
  isStaffMessage
};
