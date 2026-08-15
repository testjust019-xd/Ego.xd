/**
 * ═══════════════════════════════════════════════════════════════
 * commandAccess.js — Contrôle central des accès par rang
 * MODE SÉVÈRE++ (anti-spam / anti-abuse / progression Hunter)
 * ═══════════════════════════════════════════════════════════════
 *
 * Hiérarchie : E → D → C → B → A → S → National → Monarch
 * Owner & staff TOUJOURS exemptés.
 */
const { RANKS } = require('./hunterDB');

// ─── Quotas journaliers (sévères) ───
// -1 = illimité
const RANK_DAILY_DEFAULT = {
  E: 1,
  D: 2,
  C: 3,
  B: 4,
  A: 6,
  S: 10,
  National: 20,
  Monarch: -1
};

// ─── Multiplicateur cooldown (E/D plus lents) ───
const RANK_COOLDOWN_MULTIPLIER = {
  E: 1.5,
  D: 1.2,
  C: 1.0,
  B: 0.7,
  A: 0.5,
  S: 0.3,
  National: 0.15,
  Monarch: 0.05
};

const DEFAULT_COOLDOWN_SECONDS = 5;

/**
 * Règles d'accès par commande — SÉVÈRE++
 */
const COMMAND_RULES = {
  // ─── GENERAL (toujours libres) ───
  menu:       { minRank: null, dailyLimit: false, cooldown: 3 },
  bmenu:      { minRank: null, dailyLimit: false, cooldown: 3 },
  help:       { minRank: null, dailyLimit: false, cooldown: 2 },
  profile:    { minRank: null, dailyLimit: false, cooldown: 3 },
  ping:       { minRank: null, dailyLimit: false, cooldown: 2 },
  uptime:     { minRank: null, dailyLimit: false, cooldown: 2 },
  owner:      { minRank: null, dailyLimit: false, cooldown: 2 },
  support:    { minRank: null, dailyLimit: false, cooldown: 2 },
  activate:   { minRank: null, dailyLimit: false, cooldown: 5 },
  resetlimit: { minRank: null, dailyLimit: false, cooldown: 3 },
  resetlimits:{ minRank: null, dailyLimit: false, cooldown: 3 },
  clearlimit: { minRank: null, dailyLimit: false, cooldown: 3 },
  resetdaily: { minRank: null, dailyLimit: false, cooldown: 3 },
  staff:      { minRank: null, dailyLimit: false, cooldown: 2 },
  stats:      { minRank: null, dailyLimit: false, cooldown: 5 },
  speed:      { minRank: null, dailyLimit: false, cooldown: 2 },
  id:         { minRank: null, dailyLimit: false, cooldown: 2 },
  store:      { minRank: null, dailyLimit: false, cooldown: 3 },
  donate:     { minRank: null, dailyLimit: false, cooldown: 3 },
  settheme:   { minRank: null, dailyLimit: false, cooldown: 5 },

  // ─── AI (navigation libre, chat dès C, APIs dès A) ───
  assist:     { minRank: null, dailyLimit: false, cooldown: 3 },
  aide:       { minRank: null, dailyLimit: false, cooldown: 3 },
  ai:         { minRank: 'C', dailyLimit: true,  cooldown: 10 },
  chat:       { minRank: 'C', dailyLimit: true,  cooldown: 8 },
  ias:        { minRank: 'B', dailyLimit: true,  cooldown: 10 },
  roleplay:   { minRank: 'B', dailyLimit: true,  cooldown: 12 },
  histoire:   { minRank: 'C', dailyLimit: true,  cooldown: 10 },
  idee:       { minRank: 'C', dailyLimit: true,  cooldown: 8 },
  prompt:     { minRank: 'C', dailyLimit: true,  cooldown: 8 },
  explain:    { minRank: 'C', dailyLimit: true,  cooldown: 8 },
  corrige:    { minRank: 'C', dailyLimit: true,  cooldown: 8 },
  resume:     { minRank: 'C', dailyLimit: true,  cooldown: 8 },
  compare:    { minRank: 'C', dailyLimit: true,  cooldown: 8 },
  model:      { minRank: 'B', dailyLimit: true,  cooldown: 8 },
  groq:       { minRank: 'A', dailyLimit: true,  cooldown: 15 },
  gemini:     { minRank: 'A', dailyLimit: true,  cooldown: 15 },
  code:       { minRank: 'A', dailyLimit: true,  cooldown: 15 },

  // ─── TOOLS — downloads ───
  play:       { minRank: 'D', dailyLimit: true,  cooldown: 10 },
  play2:      { minRank: 'C', dailyLimit: true,  cooldown: 12 },
  play3:      { minRank: 'B', dailyLimit: true,  cooldown: 15 },
  ytmp3:      { minRank: 'C', dailyLimit: true,  cooldown: 12 },
  ytmp4:      { minRank: 'B', dailyLimit: true,  cooldown: 20 },
  tiktok:     { minRank: 'A', dailyLimit: true,  cooldown: 15 },
  instagram:  { minRank: 'B', dailyLimit: true,  cooldown: 12 },
  facebook:   { minRank: 'B', dailyLimit: true,  cooldown: 12 },
  twitter:    { minRank: 'B', dailyLimit: true,  cooldown: 12 },
  video:      { minRank: 'B', dailyLimit: true,  cooldown: 15 },
  shazam:     { minRank: 'A', dailyLimit: true,  cooldown: 15 },
  trailer:    { minRank: 'C', dailyLimit: true,  cooldown: 10 },

  // ─── TOOLS — génération ───
  genimg:     { minRank: 'A', dailyLimit: true,  cooldown: 25 },
  genimg2:    { minRank: 'A', dailyLimit: true,  cooldown: 30 },
  gendeo:     { minRank: 'S', dailyLimit: true,  cooldown: 60 },
  logo2:      { minRank: 'B', dailyLimit: true,  cooldown: 12 },
  logo:       { minRank: 'E', dailyLimit: true,  cooldown: 8 },
  affiche:    { minRank: 'C', dailyLimit: true,  cooldown: 10 },
  background: { minRank: 'C', dailyLimit: true,  cooldown: 10 },

  // ─── TOOLS — stickers ───
  sticker:    { minRank: 'C', dailyLimit: true,  cooldown: 8 },
  toimg:      { minRank: 'D', dailyLimit: true,  cooldown: 6 },
  telepack:   { minRank: 'C', dailyLimit: true,  cooldown: 6 },
  teleget:    { minRank: 'B', dailyLimit: true,  cooldown: 12 },
  quest:  { minRank: 'E', dailyLimit: true, cooldown: 10 },
  raid:   { minRank: 'D', dailyLimit: true, cooldown: 30 },
  boss:   { minRank: 'E', dailyLimit: true, cooldown: 20 },
  slots:  { minRank: 'E', dailyLimit: true, cooldown: 8 },
  domain: { minRank: 'E', dailyLimit: false, cooldown: 5 },
  ego:    { minRank: 'E', dailyLimit: false, cooldown: 3 },
  rateego:{ minRank: 'E', dailyLimit: false, cooldown: 5 },
  setprefix: { minRank: null },
  setpp: { minRank: null },
  clone: {
    minRank: 'B',
    dailyLimit: { B: 3, A: 5, S: 10, National: 20, Monarch: -1 },
    cooldown: 20
  },
  teleget2:   {
    minRank: 'A',
    dailyLimit: { A: 2, S: 4, National: 8, Monarch: -1 },
    cooldown: 45
  },

  // ─── TOOLS — lyrics / media info ───
  lyrics: {
    minRank: 'C',
    dailyLimit: { C: 3, B: 5, A: 8, S: 12, National: 20, Monarch: -1 },
    cooldown: 8
  },
  lyrics2: {
    minRank: 'C',
    dailyLimit: { C: 3, B: 5, A: 8, S: 12, National: 20, Monarch: -1 },
    cooldown: 8
  },
  lyrics3: {
    minRank: 'C',
    dailyLimit: { C: 3, B: 5, A: 8, S: 12, National: 20, Monarch: -1 },
    cooldown: 8
  },

  // ─── TOOLS — utils ───
  tts:        { minRank: null, dailyLimit: true,  cooldown: 6 },
  translate:  { minRank: null, dailyLimit: true,  cooldown: 5 },
  qr:         { minRank: null, dailyLimit: false, cooldown: 3 },
  qrscan:     { minRank: 'E',  dailyLimit: true,  cooldown: 6 },
  tempmail:   { minRank: 'B',  dailyLimit: true,  cooldown: 20 },
  tempnum:    { minRank: 'B',  dailyLimit: true,  cooldown: 20 },
  apk:        { minRank: 'D',  dailyLimit: true,  cooldown: 10 },
  apk2:       { minRank: 'D',  dailyLimit: true,  cooldown: 10 },
  screenshot: { minRank: 'B',  dailyLimit: true,  cooldown: 20 },
  avatar:     { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  getpp:      { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  pdf:        { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  note:       { minRank: null, dailyLimit: false, cooldown: 3 },
  remind:     { minRank: null, dailyLimit: false, cooldown: 3 },
  timer:      { minRank: null, dailyLimit: false, cooldown: 3 },
  password:   { minRank: null, dailyLimit: false, cooldown: 3 },
  base64:     { minRank: null, dailyLimit: false, cooldown: 2 },
  convert:    { minRank: null, dailyLimit: true,  cooldown: 5 },
  currency:   { minRank: null, dailyLimit: false, cooldown: 4 },
  color:      { minRank: null, dailyLimit: false, cooldown: 3 },
  checknum:   { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  shorten:    { minRank: 'E',  dailyLimit: true,  cooldown: 6 },
  meteo7:     { minRank: null, dailyLimit: true,  cooldown: 6 },

  // ─── FOOT ───
  live:       { minRank: 'E', dailyLimit: true, cooldown: 10 },
  score:      { minRank: 'E', dailyLimit: true, cooldown: 8 },
  match:      { minRank: 'E', dailyLimit: true, cooldown: 8 },
  joueur:     { minRank: 'E', dailyLimit: true, cooldown: 8 },
  equipe:     { minRank: 'E', dailyLimit: true, cooldown: 8 },
  h2h:        { minRank: 'C', dailyLimit: true, cooldown: 10 },
  cotes:      { minRank: 'C', dailyLimit: true, cooldown: 10 },
  pronostic:  { minRank: 'B', dailyLimit: true, cooldown: 12 },
  ballondor:  { minRank: 'E', dailyLimit: true, cooldown: 6 },
  buteurs:    { minRank: 'E', dailyLimit: true, cooldown: 6 },
  classement: { minRank: 'E', dailyLimit: true, cooldown: 6 },
  fclassement:{ minRank: 'E', dailyLimit: true, cooldown: 6 },
  calendrier: { minRank: 'E', dailyLimit: true, cooldown: 6 },
  mercato:    { minRank: 'E', dailyLimit: true, cooldown: 8 },
  rumeurs:    { minRank: 'E', dailyLimit: true, cooldown: 8 },
  blessures:  { minRank: 'E', dailyLimit: true, cooldown: 8 },
  compo:      { minRank: 'E', dailyLimit: true, cooldown: 8 },
  arena:      { minRank: 'D', dailyLimit: true, cooldown: 12 },
  cdmqualif:  { minRank: 'E', dailyLimit: true, cooldown: 8 },

  // ─── ANIME / SOLO ───
  arise:      { minRank: null, dailyLimit: false, cooldown: 5 },
  hunter:     { minRank: null, dailyLimit: false, cooldown: 5 },
  gate:       { minRank: 'D',  dailyLimit: true,  cooldown: 20 },
  shadow:     { minRank: 'B',  dailyLimit: false, cooldown: 12 },
  arsenal:    { minRank: 'B',  dailyLimit: false, cooldown: 12 },
  monarque:   { minRank: 'S',  dailyLimit: false, cooldown: 15 },
  waifu:      { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  neko:       { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  anime:      { minRank: 'E',  dailyLimit: true,  cooldown: 6 },
  character:  { minRank: 'E',  dailyLimit: true,  cooldown: 6 },
  cosplay:    { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  op:         { minRank: 'C',  dailyLimit: true,  cooldown: 12 },
  end:        { minRank: 'C',  dailyLimit: true,  cooldown: 12 },
  asama:      { minRank: 'B',  dailyLimit: true,  cooldown: 15 },
  solobook:   { minRank: null, dailyLimit: true,  cooldown: 5 },
  skillup:    { minRank: 'C',  dailyLimit: true,  cooldown: 12 },
  evolution:  { minRank: 'C',  dailyLimit: true,  cooldown: 12 },
  blaze:      { minRank: 'E',  dailyLimit: true,  cooldown: 8 },

  // ─── GAMES ───
  donjon:     { minRank: 'D', dailyLimit: true, cooldown: 30 },
  duel:       { minRank: 'D', dailyLimit: true, cooldown: 20 },
  combat:     { minRank: 'D', dailyLimit: true, cooldown: 20 },
  slot:       { minRank: 'C', dailyLimit: true, cooldown: 15 },
  roulette:   { minRank: 'C', dailyLimit: true, cooldown: 15 },
  loterie:    { minRank: 'C', dailyLimit: true, cooldown: 20 },
  cartes:     { minRank: 'E', dailyLimit: true, cooldown: 10 },
  pack:       { minRank: 'D', dailyLimit: true, cooldown: 15 },
  trivia:     { minRank: 'E', dailyLimit: true, cooldown: 8 },
  pendu:      { minRank: 'E', dailyLimit: true, cooldown: 8 },
  guess:      { minRank: 'E', dailyLimit: true, cooldown: 8 },
  math:       { minRank: 'E', dailyLimit: true, cooldown: 6 },
  riddle:     { minRank: 'E', dailyLimit: true, cooldown: 8 },
  puzzle:     { minRank: 'E', dailyLimit: true, cooldown: 8 },
  motmystere: { minRank: 'E', dailyLimit: true, cooldown: 8 },
  spy:        { minRank: 'D', dailyLimit: true, cooldown: 12 },
  course:     { minRank: 'D', dailyLimit: true, cooldown: 15 },
  chevaux:    { minRank: 'D', dailyLimit: true, cooldown: 15 },
  truth:      { minRank: 'E', dailyLimit: true, cooldown: 6 },
  dare:       { minRank: 'E', dailyLimit: true, cooldown: 6 },
  wyr:        { minRank: 'E', dailyLimit: true, cooldown: 6 },
  sondage:    { minRank: null, dailyLimit: false, cooldown: 5 },
  streak:     { minRank: 'E', dailyLimit: true, cooldown: 12 },

  // ─── ECONOMY (anti-farm) ───
  balance:    { minRank: null, dailyLimit: false, cooldown: 3 },
  daily:      { minRank: null, dailyLimit: false, cooldown: 5 },
  work:       { minRank: 'E',  dailyLimit: true,  cooldown: 120 },
  transfer:   { minRank: 'E',  dailyLimit: true,  cooldown: 10 },
  rob:        { minRank: 'B',  dailyLimit: true,  cooldown: 180 },
  leaderboard:{ minRank: null, dailyLimit: false, cooldown: 5 },
  rank:       { minRank: null, dailyLimit: false, cooldown: 3 },

  // ─── SEARCH ───
  wiki:       { minRank: null, dailyLimit: true, cooldown: 6 },
  weather:    { minRank: null, dailyLimit: true, cooldown: 6 },
  img:        { minRank: 'E',  dailyLimit: true, cooldown: 10 },
  define:     { minRank: null, dailyLimit: true, cooldown: 5 },
  country:    { minRank: null, dailyLimit: true, cooldown: 5 },
  wallpaper:  { minRank: 'E',  dailyLimit: true, cooldown: 10 },

  // ─── FUN (léger libre, abusables restreints) ───
  meme:       { minRank: 'E', dailyLimit: true,  cooldown: 6 },
  fake:       { minRank: 'D', dailyLimit: true,  cooldown: 10 },
  roast:      { minRank: 'E', dailyLimit: true,  cooldown: 6 },
  // le reste (joke, dice, cat, dog, etc.) → CATEGORY_DEFAULTS fun

  // ─── SOCIAL ───
  // défauts catégorie

  // ─── TEXTMAKER / CI / REACTIONS ───
  // défauts catégorie (libres, cooldowns courts)
};

/**
 * Défauts par catégorie si la commande n'est pas dans COMMAND_RULES.
 */
const CATEGORY_DEFAULTS = {
  ai:         { minRank: 'C',  dailyLimit: true,  cooldown: 8 },
  tools:      { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  edit:       { minRank: 'E',  dailyLimit: true,  cooldown: 15 },
  foot:       { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  anime:      { minRank: 'E',  dailyLimit: true,  cooldown: 6 },
  solo:       { minRank: null, dailyLimit: false, cooldown: 5 },
  games:      { minRank: 'E',  dailyLimit: true,  cooldown: 10 },
  economy:    { minRank: 'E',  dailyLimit: true,  cooldown: 8 },
  search:     { minRank: null, dailyLimit: true,  cooldown: 6 },
  fun:        { minRank: null, dailyLimit: false, cooldown: 5 },
  social:     { minRank: null, dailyLimit: false, cooldown: 5 },
  textmaker:  { minRank: null, dailyLimit: false, cooldown: 4 },
  ci:         { minRank: null, dailyLimit: false, cooldown: 4 },
  general:    { minRank: null, dailyLimit: false, cooldown: 3 },
  groups:     { minRank: null, dailyLimit: false, cooldown: 3 },
  moderation: { minRank: null, dailyLimit: false, cooldown: 3 },
  reactions:  { minRank: null, dailyLimit: false, cooldown: 3 },
  manager:    { minRank: null, dailyLimit: false, cooldown: 3 },
};

function getAccessRules(commandName, category) {
  const fromCmd = COMMAND_RULES[commandName];
  if (fromCmd) {
    return {
      minRank: fromCmd.minRank ?? null,
      dailyLimit: fromCmd.dailyLimit ?? false,
      cooldown: fromCmd.cooldown ?? DEFAULT_COOLDOWN_SECONDS
    };
  }
  const fromCat = CATEGORY_DEFAULTS[category];
  if (fromCat) {
    return {
      minRank: fromCat.minRank ?? null,
      dailyLimit: fromCat.dailyLimit ?? false,
      cooldown: fromCat.cooldown ?? DEFAULT_COOLDOWN_SECONDS
    };
  }
  return {
    minRank: null,
    dailyLimit: false,
    cooldown: DEFAULT_COOLDOWN_SECONDS
  };
}

function getDailyLimitForRank(rank, base = true) {
  if (base === false || base === null || base === undefined) return -1;
  if (typeof base === 'object' && !Array.isArray(base)) {
    if (base[rank] !== undefined) return base[rank];
    const idx = RANKS.indexOf(rank);
    for (let i = idx - 1; i >= 0; i--) {
      if (base[RANKS[i]] !== undefined) return base[RANKS[i]];
    }
    return 0;
  }
  const table = RANK_DAILY_DEFAULT;
  if (base === true) {
    return table[rank] !== undefined ? table[rank] : table.E;
  }
  const eLimit = table.E || 1;
  const rankLimit = table[rank] !== undefined ? table[rank] : eLimit;
  if (rankLimit < 0) return -1;
  return Math.max(1, Math.ceil((Number(base) * rankLimit) / eLimit));
}

function getCooldownMultiplier(rank) {
  return RANK_COOLDOWN_MULTIPLIER[rank] !== undefined
    ? RANK_COOLDOWN_MULTIPLIER[rank]
    : 1.0;
}

function effectiveCooldownSeconds(baseSeconds, rank) {
  if (!baseSeconds || baseSeconds <= 0) return 0;
  return baseSeconds * getCooldownMultiplier(rank);
}

module.exports = {
  RANKS,
  RANK_DAILY_DEFAULT,
  RANK_COOLDOWN_MULTIPLIER,
  DEFAULT_COOLDOWN_SECONDS,
  COMMAND_RULES,
  CATEGORY_DEFAULTS,
  getAccessRules,
  getDailyLimitForRank,
  getCooldownMultiplier,
  effectiveCooldownSeconds
};
