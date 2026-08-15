const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'manager.json');

function loadDB() {
  try {
    const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    if (!db.leagues) db.leagues = {};
    if (!db.cups) db.cups = {};
    if (!db.ucl) db.ucl = {};
    if (!db.challenges) db.challenges = {};
    if (!db.offers) db.offers = [];
    if (!db.listings) db.listings = [];
    return db;
  } catch {
    return { clubs: {}, market: null, leagues: {}, cups: {}, ucl: {}, challenges: {}, offers: [], listings: [] };
  }
}

function saveDB(db) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

/** Récupère le club d'un utilisateur, ou null s'il n'en a pas encore créé un */
function getClub(jid) {
  const db = loadDB();
  return db.clubs[jid] || null;
}

/** Crée un club pour un utilisateur (échoue silencieusement si un existe déjà) */
function createClub(jid, club) {
  const db = loadDB();
  if (db.clubs[jid]) return db.clubs[jid];
  db.clubs[jid] = club;
  saveDB(db);
  return club;
}

/** Met à jour partiellement le club d'un utilisateur */
function updateClub(jid, updates) {
  const db = loadDB();
  if (!db.clubs[jid]) return null;
  db.clubs[jid] = { ...db.clubs[jid], ...updates };
  saveDB(db);
  return db.clubs[jid];
}

/** Retourne tous les clubs sous forme de tableau [{jid, ...club}] */
function getAllClubs() {
  const db = loadDB();
  return Object.entries(db.clubs).map(([jid, club]) => ({ jid, ...club }));
}

/** Récupère le marché des transferts courant (peut être null si jamais généré) */
function getMarket() {
  const db = loadDB();
  return db.market;
}

/** Remplace le marché des transferts */
function setMarket(market) {
  const db = loadDB();
  db.market = market;
  saveDB(db);
  return market;
}

// ─── Ligues de groupe ───

function getLeague(groupJid) {
  const db = loadDB();
  return db.leagues[groupJid] || null;
}

function createLeague(groupJid, league) {
  const db = loadDB();
  db.leagues[groupJid] = league;
  saveDB(db);
  return league;
}

function updateLeague(groupJid, updates) {
  const db = loadDB();
  if (!db.leagues[groupJid]) return null;
  db.leagues[groupJid] = { ...db.leagues[groupJid], ...updates };
  saveDB(db);
  return db.leagues[groupJid];
}

function deleteLeague(groupJid) {
  const db = loadDB();
  delete db.leagues[groupJid];
  saveDB(db);
}

// ─── Défis directs (PvP amical) ───
// Une seule invitation en attente par cible à la fois (clé = jid du défié)

function getChallenge(toJid) {
  const db = loadDB();
  return db.challenges[toJid] || null;
}

function setChallenge(toJid, challenge) {
  const db = loadDB();
  db.challenges[toJid] = challenge;
  saveDB(db);
  return challenge;
}

function deleteChallenge(toJid) {
  const db = loadDB();
  delete db.challenges[toJid];
  saveDB(db);
}

// ─── Offres de transfert entre managers ───

function getOffers() {
  const db = loadDB();
  return db.offers;
}

function addOffer(offer) {
  const db = loadDB();
  db.offers.push(offer);
  saveDB(db);
  return offer;
}

function getOffer(id) {
  const db = loadDB();
  return db.offers.find(o => o.id === id) || null;
}

function removeOffer(id) {
  const db = loadDB();
  db.offers = db.offers.filter(o => o.id !== id);
  saveDB(db);
}


// ─── Coupe de groupe ───
function getCup(groupJid) {
  const db = loadDB();
  return db.cups[groupJid] || null;
}
function createCup(groupJid, cup) {
  const db = loadDB();
  db.cups[groupJid] = cup;
  saveDB(db);
  return cup;
}
function updateCup(groupJid, updates) {
  const db = loadDB();
  if (!db.cups[groupJid]) return null;
  db.cups[groupJid] = { ...db.cups[groupJid], ...updates };
  saveDB(db);
  return db.cups[groupJid];
}
function deleteCup(groupJid) {
  const db = loadDB();
  delete db.cups[groupJid];
  saveDB(db);
}

// ─── Ligue des Champions (groupe) ───
function getUcl(groupJid) {
  const db = loadDB();
  return db.ucl[groupJid] || null;
}
function createUcl(groupJid, ucl) {
  const db = loadDB();
  db.ucl[groupJid] = ucl;
  saveDB(db);
  return ucl;
}
function updateUcl(groupJid, updates) {
  const db = loadDB();
  if (!db.ucl[groupJid]) return null;
  db.ucl[groupJid] = { ...db.ucl[groupJid], ...updates };
  saveDB(db);
  return db.ucl[groupJid];
}
function deleteUcl(groupJid) {
  const db = loadDB();
  delete db.ucl[groupJid];
  saveDB(db);
}


// ─── Listings mercato public ───
function getListings() {
  const db = loadDB();
  return db.listings || [];
}
function addListing(listing) {
  const db = loadDB();
  if (!db.listings) db.listings = [];
  db.listings.push(listing);
  saveDB(db);
  return listing;
}
function getListing(id) {
  const db = loadDB();
  return (db.listings || []).find(l => l.id === id) || null;
}
function removeListing(id) {
  const db = loadDB();
  db.listings = (db.listings || []).filter(l => l.id !== id);
  saveDB(db);
}
function updateListing(id, updates) {
  const db = loadDB();
  const i = (db.listings || []).findIndex(l => l.id === id);
  if (i < 0) return null;
  db.listings[i] = { ...db.listings[i], ...updates };
  saveDB(db);
  return db.listings[i];
}

module.exports = {
  getClub, createClub, updateClub, getAllClubs, getMarket, setMarket,
  getLeague, createLeague, updateLeague, deleteLeague,
  getCup, createCup, updateCup, deleteCup,
  getUcl, createUcl, updateUcl, deleteUcl,
  getChallenge, setChallenge, deleteChallenge,
  getOffers, addOffer, getOffer, removeOffer,
  getListings, addListing, getListing, removeListing, updateListing
};
