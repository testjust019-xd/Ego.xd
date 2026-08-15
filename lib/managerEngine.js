const crypto = require('crypto');

// ─── Constantes de config du mode manager ───

const STARTING_BUDGET = 5_000_000;
const TRAIN_COOLDOWN_MS = 4 * 60 * 60 * 1000;      // 4h
const MATCH_COOLDOWN_MS = 2 * 60 * 60 * 1000;      // 2h
const RECETTE_COOLDOWN_MS = 3 * 60 * 60 * 1000;    // 3h
const MARKET_REFRESH_MS = 6 * 60 * 60 * 1000;      // 6h
const MARKET_SIZE = 6;
const TRAIN_COST = 8_000;

// ─── Boutique manager ───
const SHOP_ITEMS = {
  boost_moral: {
    id: 'boost_moral',
    name: 'Séance motivation',
    desc: '+15 moral à tout l\'effectif',
    price: 25_000,
    type: 'instant'
  },
  boost_train: {
    id: 'boost_train',
    name: 'Staff d\'entraînement',
    desc: 'Prochain entraînement gratuit + gains x2',
    price: 40_000,
    type: 'consumable'
  },
  scout_jeune: {
    id: 'scout_jeune',
    name: 'Scout jeunesse',
    desc: 'Recrute un jeune 17-21 ans (potentiel élevé)',
    price: 120_000,
    type: 'instant'
  },
  medecin: {
    id: 'medecin',
    name: 'Staff médical',
    desc: 'Reset les cooldowns match + entraînement',
    price: 60_000,
    type: 'instant'
  },
  boost_rep: {
    id: 'boost_rep',
    name: 'Campagne média',
    desc: '+5 réputation (max 100)',
    price: 35_000,
    type: 'instant'
  },
  talisman: {
    id: 'talisman',
    name: 'Talisman de match',
    desc: '+3 force club pour le prochain match amical/PvP',
    price: 50_000,
    type: 'consumable'
  },
  agent: {
    id: 'agent',
    name: 'Agent star',
    desc: 'Ajoute un joueur 75-85 OVR sur le marché (ton club uniquement via .mercato refresh)',
    price: 200_000,
    type: 'instant'
  }
};



const POSITIONS = ['GB', 'DC', 'DD', 'DG', 'MDC', 'MC', 'MOC', 'AD', 'AG', 'BU'];

const FORMATIONS = {
  '4-4-2':   { label: '4-4-2 (équilibré)',      atkMod: 1.00, defMod: 1.00 },
  '4-3-3':   { label: '4-3-3 (offensif)',       atkMod: 1.10, defMod: 0.95 },
  '3-5-2':   { label: '3-5-2 (milieu fort)',    atkMod: 1.02, defMod: 0.97 },
  '4-2-3-1': { label: '4-2-3-1 (verrouillé)',   atkMod: 0.97, defMod: 1.08 },
  '5-3-2':   { label: '5-3-2 (ultra défensif)', atkMod: 0.88, defMod: 1.18 },
  '3-4-3':   { label: '3-4-3 (tout attaque)',   atkMod: 1.18, defMod: 0.85 }
};

const STADIUM_TIERS = [
  null, // index 0 inutilisé
  { tier: 1, name: 'Terrain municipal', capacity: 500,    upgradeCost: 0 },
  { tier: 2, name: 'Stade communal',    capacity: 3000,   upgradeCost: 50_000 },
  { tier: 3, name: 'Stade régional',    capacity: 12000,  upgradeCost: 150_000 },
  { tier: 4, name: 'Stade moderne',     capacity: 35000,  upgradeCost: 400_000 },
  { tier: 5, name: 'Arena Continentale',capacity: 80000,  upgradeCost: 900_000 }
];
const MAX_STADIUM_TIER = STADIUM_TIERS.length - 1;

const FIRST_NAMES = [
  "Yao", "Kouassi", "Adama", "Ibrahim", "Moussa", "Souleymane", "Franck", "Didier",
  "Cheick", "Aboubakar", "Bertin", "Serge", "Emmanuel", "Junior", "Wilfried", "Lassina",
  "Gervinho", "Max", "Christian", "Roger", "Théo", "Hugo", "Nathan", "Diego", "Bruno",
  "Carlos", "Mateo", "Luca", "Kevin", "Marco", "Karim", "Yannick", "Bakary", "Salif"
];
const LAST_NAMES = [
  "Kouadio", "Traoré", "Koné", "Diabaté", "Bamba", "Ouattara", "N'Guessan", "Gnabry",
  "Dembélé", "Sanogo", "Fofana", "Touré", "Zabi", "Camara", "Silva", "Fernandez",
  "Rossi", "Müller", "Novak", "Dupont", "Martins", "Costa", "Diallo", "Coulibaly",
  "Bakayoko", "Yao", "Aka", "Digbeu", "Gohou", "Kalou"
];

const RIVAL_CLUBS = [
  "FC Sanwi", "Racing du Sud", "Étoile de la Lagune", "AS Comoé", "Bassam FC",
  "Olympique du Littoral", "Renaissance FC", "Ébrié United", "Lagunaires FC",
  "Atlantique SC", "Espoir de Grand-Bassam", "Panthères Noires", "Wanders FC",
  "Cocotiers United", "Tonnerre du Sud"
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/** Loi de Poisson (méthode de Knuth) — pour un nombre de buts réaliste */
function poissonRandom(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function generatePlayerId() {
  return crypto.randomBytes(3).toString('hex');
}

/** Génère un joueur avec une note de base donnée (+/- variance) */
function generatePlayer(baseRating = 60) {
  const pos = pick(POSITIONS);
  const rating = clamp(baseRating + randInt(-8, 8), 35, 92);
  const age = randInt(17, 34);
  const potentialBonus = age < 23 ? randInt(2, 15) : randInt(0, 3);
  const potential = clamp(rating + potentialBonus, rating, 95);
  const price = calcPlayerValue({ rating, age, potential });

  return {
    id: generatePlayerId(),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    pos,
    age,
    rating,
    potential,
    price,
    morale: 70
  };
}

/** Calcule la valeur marchande d'un joueur selon sa note, son âge et son potentiel */
function calcPlayerValue({ rating, age, potential }) {
  let value = Math.round(rating * rating * 45);
  if (age < 23) value = Math.round(value * 1.4); // prime jeunesse
  else if (age > 30) value = Math.round(value * 0.6); // décote âge
  value += (potential - rating) * 8000; // prime au potentiel
  return Math.max(3000, Math.round(value / 500) * 500);
}

/** Crée un club neuf avec une équipe de départ générée aléatoirement */
function createNewClub(name) {
  const squad = [];
  // 1 gardien, 4 défenseurs, 3 milieux, 3 attaquants pour démarrer
  const startPositions = ['GB', 'DC', 'DD', 'DG', 'DC', 'MDC', 'MC', 'MOC', 'AD', 'AG', 'BU'];
  for (const pos of startPositions) {
    const rating = randInt(48, 62);
    const age = randInt(18, 30);
    const potential = clamp(rating + (age < 23 ? randInt(2, 10) : randInt(0, 3)), rating, 90);
    squad.push({
      id: generatePlayerId(),
      name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
      pos,
      age,
      rating,
      potential,
      price: calcPlayerValue({ rating, age, potential }),
      morale: 70
    });
  }

  return {
    name,
    createdAt: Date.now(),
    budget: STARTING_BUDGET,
    reputation: 50,
    stadiumTier: 1,
    formation: '4-4-2',
    squad,
    stats: { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 },
    lastTrain: 0,
    lastMatch: 0,
    lastRecette: 0
  };
}

/** Régénère le marché des transferts s'il est trop vieux (ou absent) */
function refreshMarketIfNeeded(market) {
  if (market && Date.now() - market.generatedAt < MARKET_REFRESH_MS) {
    return market;
  }
  const players = [];
  for (let i = 0; i < MARKET_SIZE; i++) {
    players.push(generatePlayer(randInt(55, 80)));
  }
  return { generatedAt: Date.now(), players };
}

/** Calcule la force globale d'un club (0-100+) à partir de son onze de départ */
function calcClubPower(club) {
  if (!club.squad.length) return 30;
  const startXI = [...club.squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
  const avgRating = startXI.reduce((sum, p) => sum + p.rating, 0) / startXI.length;

  const squadPenalty = startXI.length < 11 ? (11 - startXI.length) * 3 : 0;
  const repBonus = (club.reputation - 50) / 25; // -2 à +2
  const formation = FORMATIONS[club.formation] || FORMATIONS['4-4-2'];
  const tacticBonus = ((formation.atkMod + formation.defMod) / 2 - 1) * 20;

  return clamp(avgRating + repBonus + tacticBonus - squadPenalty, 20, 99);
}

/** Simule un match amical entre le club du joueur et un adversaire NPC généré */
function simulateFriendly(club) {
  const myFormation = FORMATIONS[club.formation] || FORMATIONS['4-4-2'];
  const myPower = calcClubPower(club);

  const oppName = pick(RIVAL_CLUBS);
  const oppPower = clamp(myPower + randInt(-10, 10), 25, 95);

  const diff = (myPower - oppPower) / 10;
  const myExpected = clamp(1.3 + diff * 0.45, 0.3, 4.5) * myFormation.atkMod;
  const oppExpected = clamp(1.3 - diff * 0.45, 0.3, 4.5) / myFormation.defMod;

  const myGoals = poissonRandom(myExpected);
  const oppGoals = poissonRandom(oppExpected);

  let result;
  if (myGoals > oppGoals) result = 'win';
  else if (myGoals < oppGoals) result = 'loss';
  else result = 'draw';

  const stadium = STADIUM_TIERS[club.stadiumTier];
  const baseReward = 15_000 + stadium.tier * 8_000;
  const rewardMult = result === 'win' ? 1.5 : result === 'draw' ? 1.0 : 0.5;
  const reward = Math.round(baseReward * rewardMult * (0.85 + Math.random() * 0.3));

  const repChange = result === 'win' ? 2 : result === 'loss' ? -1 : 0;

  return { oppName, oppPower: Math.round(oppPower), myGoals, oppGoals, result, reward, repChange };
}

/** Entraîne jusqu'à 3 joueurs au hasard, plafonné par leur potentiel */
function trainSquad(squad) {
  const trained = [];
  const count = Math.min(3, squad.length);
  const indices = new Set();
  while (indices.size < count) indices.add(randInt(0, squad.length - 1));

  for (const i of indices) {
    const p = squad[i];
    if (p.rating < p.potential) {
      const gain = randInt(1, 3);
      const newRating = clamp(p.rating + gain, p.rating, p.potential);
      const actualGain = newRating - p.rating;
      p.rating = newRating;
      p.price = calcPlayerValue(p);
      if (actualGain > 0) trained.push({ name: p.name, gain: actualGain });
    }
  }
  return trained;
}

const CHALLENGE_TTL_MS = 15 * 60 * 1000; // 15 min pour accepter un défi
const PVP_COOLDOWN_MS = 30 * 60 * 1000;  // 30 min entre deux défis PvP pour un même club

/** Tire un buteur probable parmi les attaquants/milieux offensifs */
function pickScorer(squad) {
  if (!squad || !squad.length) return 'Joueur inconnu';
  const attackers = squad.filter(p => ['BU', 'AD', 'AG', 'MOC', 'MC'].includes(p.pos));
  const pool = attackers.length ? attackers : squad;
  // pondération par note
  const weights = pool.map(p => Math.max(1, p.rating - 40));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i].name;
  }
  return pool[0].name;
}

/**
 * Simule un match réel entre deux clubs avec rapport détaillé :
 * buteurs, minutes, possession, tirs, cartons, événements.
 */
function simulateRealMatch(clubA, clubB, options = {}) {
  const formA = FORMATIONS[clubA.formation] || FORMATIONS['4-4-2'];
  const formB = FORMATIONS[clubB.formation] || FORMATIONS['4-4-2'];
  const powerA = calcClubPower(clubA);
  const powerB = calcClubPower(clubB);

  const diff = (powerA - powerB) / 10;
  const expA = clamp(1.25 + diff * 0.45, 0.3, 4.5) * formA.atkMod / formB.defMod;
  const expB = clamp(1.25 - diff * 0.45, 0.3, 4.5) * formB.atkMod / formA.defMod;

  let goalsA = poissonRandom(clamp(expA, 0.2, 5));
  let goalsB = poissonRandom(clamp(expB, 0.2, 5));

  // Prolongations / tirs au but si match à élimination directe et égalité
  let extraTime = false;
  let penalties = false;
  let penA = null, penB = null;

  if (options.knockout && goalsA === goalsB) {
    extraTime = true;
    const etA = poissonRandom(0.6);
    const etB = poissonRandom(0.6);
    goalsA += etA;
    goalsB += etB;
    if (goalsA === goalsB) {
      penalties = true;
      // simuler tirs au but (meilleure équipe un peu avantagée)
      const skillA = 0.72 + (powerA - 50) / 200;
      const skillB = 0.72 + (powerB - 50) / 200;
      penA = 0; penB = 0;
      for (let i = 0; i < 5; i++) {
        if (Math.random() < skillA) penA++;
        if (Math.random() < skillB) penB++;
      }
      while (penA === penB) {
        if (Math.random() < skillA) penA++;
        if (Math.random() < skillB) penB++;
      }
    }
  }

  let result;
  if (penalties) result = penA > penB ? 'A' : 'B';
  else if (goalsA > goalsB) result = 'A';
  else if (goalsA < goalsB) result = 'B';
  else result = 'draw';

  // Buteurs + minutes
  const scorersA = [];
  const scorersB = [];
  const usedMinutes = new Set();
  for (let i = 0; i < goalsA; i++) {
    let min = randInt(1, extraTime ? 120 : 90);
    while (usedMinutes.has(min)) min = randInt(1, extraTime ? 120 : 90);
    usedMinutes.add(min);
    scorersA.push({ name: pickScorer(clubA.squad), minute: min });
  }
  for (let i = 0; i < goalsB; i++) {
    let min = randInt(1, extraTime ? 120 : 90);
    while (usedMinutes.has(min)) min = randInt(1, extraTime ? 120 : 90);
    usedMinutes.add(min);
    scorersB.push({ name: pickScorer(clubB.squad), minute: min });
  }
  scorersA.sort((a, b) => a.minute - b.minute);
  scorersB.sort((a, b) => a.minute - b.minute);

  // Stats réalistes
  const possA = clamp(Math.round(50 + (powerA - powerB) * 0.35 + randInt(-6, 6)), 28, 72);
  const possB = 100 - possA;
  const shotsA = clamp(Math.round(goalsA * 3.2 + randInt(3, 10) + (powerA - 50) / 8), 2, 28);
  const shotsB = clamp(Math.round(goalsB * 3.2 + randInt(3, 10) + (powerB - 50) / 8), 2, 28);
  const onTargetA = clamp(goalsA + randInt(1, Math.max(1, Math.floor(shotsA / 3))), 0, shotsA);
  const onTargetB = clamp(goalsB + randInt(1, Math.max(1, Math.floor(shotsB / 3))), 0, shotsB);
  const cornersA = randInt(2, 12);
  const cornersB = randInt(2, 12);
  const yellowA = randInt(0, 4);
  const yellowB = randInt(0, 4);
  const redA = Math.random() < 0.08 ? 1 : 0;
  const redB = Math.random() < 0.08 ? 1 : 0;

  // Événements narratifs
  const events = [];
  for (const s of scorersA) {
    events.push({ minute: s.minute, text: `⚽ ${s.minute}' BUT — ${s.name} (${clubA.name})` });
  }
  for (const s of scorersB) {
    events.push({ minute: s.minute, text: `⚽ ${s.minute}' BUT — ${s.name} (${clubB.name})` });
  }
  if (redA) events.push({ minute: randInt(20, 85), text: `🟥 Carton rouge — ${clubA.name}` });
  if (redB) events.push({ minute: randInt(20, 85), text: `🟥 Carton rouge — ${clubB.name}` });
  if (extraTime) events.push({ minute: 90, text: '⏱️ Prolongations !' });
  if (penalties) events.push({ minute: 120, text: `🎯 Tirs au but : ${penA}-${penB}` });
  events.sort((a, b) => a.minute - b.minute);

  return {
    powerA: Math.round(powerA),
    powerB: Math.round(powerB),
    goalsA,
    goalsB,
    result,
    scorersA,
    scorersB,
    extraTime,
    penalties,
    penA,
    penB,
    stats: {
      possession: [possA, possB],
      shots: [shotsA, shotsB],
      onTarget: [onTargetA, onTargetB],
      corners: [cornersA, cornersB],
      yellow: [yellowA, yellowB],
      red: [redA, redB]
    },
    events
  };
}



function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Construit la timeline "live" à partir d'une simu déjà calculée.
 * Le score final est connu, mais on le révèle progressivement.
 */
function buildLiveSteps(homeName, awayName, sim) {
  const steps = [];
  const events = [...(sim.events || [])].sort((a, b) => a.minute - b.minute);

  steps.push({
    delayMs: 0,
    text:
      `🏁 *COUP D'ENVOI*\n` +
      `*${homeName}*  vs  *${awayName}*\n` +
      `📊 Forces : ${sim.powerA}/100 — ${sim.powerB}/100\n` +
      `⏱ Le match commence…`
  });

  const goalsBefore = (maxMin) => ({
    a: (sim.scorersA || []).filter(s => s.minute <= maxMin).length,
    b: (sim.scorersB || []).filter(s => s.minute <= maxMin).length
  });

  let halfTimeSent = false;
  let sentEvents = 0;
  const MAX_EVENTS = 8;

  for (const e of events) {
    // Mi-temps avant le premier événement de la 2e période
    if (!halfTimeSent && e.minute > 45) {
      const ht = goalsBefore(45);
      steps.push({
        delayMs: 2200,
        text: `⏸ *MI-TEMPS*\n*${homeName}* ${ht.a} - ${ht.b} *${awayName}*`
      });
      halfTimeSent = true;
    }

    // Événements déjà narrés à part (prol / TAB) en fin
    if (/Prolongations|Tirs au but/i.test(e.text || '')) continue;

    if (sentEvents >= MAX_EVENTS) continue;
    steps.push({ delayMs: 2000, text: e.text });
    sentEvents++;
  }

  if (!halfTimeSent) {
    const ht = goalsBefore(45);
    // Si match 0-0 sans events, on montre quand même une mi-temps légère
    if ((sim.goalsA + sim.goalsB) === 0) {
      steps.push({
        delayMs: 2500,
        text: `⏸ *MI-TEMPS*\n*${homeName}* 0 - 0 *${awayName}*\nPeu d'occasions de part et d'autre…`
      });
      halfTimeSent = true;
    } else if (events.every(e => e.minute <= 45)) {
      steps.push({
        delayMs: 2200,
        text: `⏸ *MI-TEMPS*\n*${homeName}* ${ht.a} - ${ht.b} *${awayName}*`
      });
    }
  }

  if (sim.extraTime) {
    steps.push({ delayMs: 2200, text: `⏱️ *PROLONGATIONS* ! Le match repart pour 30 minutes.` });
  }
  if (sim.penalties) {
    steps.push({
      delayMs: 2200,
      text: `🎯 *SÉANCE DE TIRS AU BUT*\n${homeName} ${sim.penA} - ${sim.penB} ${awayName}`
    });
  }

  steps.push({
    delayMs: 2500,
    text:
      `🔊 *FIN DU MATCH*\n` +
      `⚽ *${homeName}* ${sim.goalsA} - ${sim.goalsB} *${awayName}*` +
      (sim.penalties ? ` (TAB ${sim.penA}-${sim.penB})` : sim.extraTime ? ' (a.p.)' : '')
  });

  return steps;
}

/**
 * Envoie la narration live via une fonction d'envoi async (ex: replyText bound).
 * @param {(text: string) => Promise<any>} sendFn
 */
async function narrateLiveMatch(sendFn, homeName, awayName, sim) {
  const steps = buildLiveSteps(homeName, awayName, sim);
  for (const step of steps) {
    if (step.delayMs > 0) await sleep(step.delayMs);
    if (step.text) await sendFn(step.text);
  }
}

/** Génère un adversaire NPC pour les amicaux (même moteur que les vrais matchs) */
function generateNpcClub(refClub) {
  const myPower = calcClubPower(refClub);
  const target = clamp(Math.round(myPower + randInt(-10, 10)), 35, 90);
  const squad = [];
  for (let i = 0; i < 11; i++) {
    squad.push(generatePlayer(clamp(target + randInt(-6, 6), 40, 88)));
  }
  const forms = Object.keys(FORMATIONS);
  return {
    name: pick(RIVAL_CLUBS),
    formation: forms[randInt(0, forms.length - 1)],
    reputation: clamp((refClub.reputation || 50) + randInt(-12, 12), 25, 95),
    squad,
    stadiumTier: refClub.stadiumTier || 1,
    stats: { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 }
  };
}


/** Formate un rapport de match détaillé pour WhatsApp */
function formatMatchReport(homeName, awayName, sim) {
  let scoreLine = `⚽ *${homeName}* ${sim.goalsA} - ${sim.goalsB} *${awayName}*`;
  if (sim.penalties) scoreLine += ` (TAB ${sim.penA}-${sim.penB})`;
  else if (sim.extraTime) scoreLine += ' (a.p.)';

  let text = `${scoreLine}\n`;
  text += `(forces : ${sim.powerA}/100 vs ${sim.powerB}/100)\n\n`;

  if (sim.scorersA.length || sim.scorersB.length) {
    text += '*Buteurs*\n';
    for (const s of sim.scorersA) text += `🟢 ${s.minute}' ${s.name}\n`;
    for (const s of sim.scorersB) text += `🔴 ${s.minute}' ${s.name}\n`;
    text += '\n';
  }

  if (sim.events && sim.events.length) {
    text += '*Temps forts*\n';
    // max 8 events pour ne pas spammer
    for (const e of sim.events.slice(0, 8)) text += `${e.text}\n`;
    text += '\n';
  }

  const st = sim.stats;
  if (st) {
    text += '*Stats*\n';
    text += `Possession ${st.possession[0]}% - ${st.possession[1]}%\n`;
    text += `Tirs ${st.shots[0]} (${st.onTarget[0]} cadrés) - ${st.shots[1]} (${st.onTarget[1]} cadrés)\n`;
    text += `Corners ${st.corners[0]} - ${st.corners[1]}\n`;
    text += `Cartons 🟨 ${st.yellow[0]}-${st.yellow[1]}  🟥 ${st.red[0]}-${st.red[1]}\n`;
  }

  return text;
}

/**
 * Génère un tableau d'élimination directe (coupe / UCL).
 * members = array de jid. Si impair, un bye est donné au premier.
 */
function generateKnockoutBracket(members) {
  const list = [...members];
  // mélanger
  for (let i = list.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [list[i], list[j]] = [list[j], list[i]];
  }
  // compléter à puissance de 2 avec byes (null)
  let size = 1;
  while (size < list.length) size *= 2;
  while (list.length < size) list.push(null);

  const rounds = [];
  let current = list;
  while (current.length >= 2) {
    const fixtures = [];
    for (let i = 0; i < current.length; i += 2) {
      const home = current[i];
      const away = current[i + 1];
      if (home === null && away === null) continue;
      // bye auto-win
      if (home === null || away === null) {
        fixtures.push({
          home: home || away,
          away: null,
          played: true,
          homeGoals: 3,
          awayGoals: 0,
          winner: home || away,
          bye: true
        });
      } else {
        fixtures.push({
          home, away, played: false,
          homeGoals: null, awayGoals: null,
          winner: null, bye: false
        });
      }
    }
    rounds.push(fixtures);
    // next round placeholders
    current = fixtures.map(f => f.winner); // may be null until played
    if (fixtures.length === 1) break;
    // for unplayed, keep slots
    current = new Array(fixtures.length).fill(null);
  }
  return rounds;
}

function advanceKnockout(rounds) {
  // Après chaque match joué, propager les winners vers le tour suivant
  for (let r = 0; r < rounds.length - 1; r++) {
    const round = rounds[r];
    const next = rounds[r + 1];
    for (let i = 0; i < round.length; i++) {
      const f = round[i];
      if (!f.played || !f.winner) continue;
      const nextIdx = Math.floor(i / 2);
      if (!next[nextIdx]) continue;
      if (i % 2 === 0) next[nextIdx].home = f.winner;
      else next[nextIdx].away = f.winner;
      // si les deux sont connus et l'un est null (bye déjà géré)
      if (next[nextIdx].home && next[nextIdx].away === null && !next[nextIdx].played) {
        // wait for away
      }
    }
  }
  return rounds;
}

const COMPETITION_REWARDS = {
  league: { win: 25000, draw: 12000, loss: 6000 },
  cup: { win: 40000, draw: 0, loss: 10000 },
  ucl: { win: 80000, draw: 25000, loss: 15000 }
};


/**
 * Génère un calendrier aller simple (méthode du cercle) : chaque manager
 * affronte chaque autre manager du groupe exactement une fois. Si le nombre
 * de participants est impair, un tour de repos ("bye") est ignoré.
 */
function generateFixtures(members) {
  const list = [...members];
  if (list.length % 2 !== 0) list.push(null);
  const n = list.length;
  const half = n / 2;
  const fixtures = [];
  let arr = [...list];

  for (let round = 0; round < n - 1; round++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home !== null && away !== null) {
        fixtures.push({ home, away, played: false, homeGoals: null, awayGoals: null });
      }
    }
    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr = [fixed, ...rest];
  }
  return fixtures;
}

function initStandings(members) {
  const standings = {};
  for (const jid of members) {
    standings[jid] = { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, points: 0 };
  }
  return standings;
}

module.exports = {
  STARTING_BUDGET, TRAIN_COOLDOWN_MS, MATCH_COOLDOWN_MS, RECETTE_COOLDOWN_MS,
  MARKET_REFRESH_MS, TRAIN_COST, CHALLENGE_TTL_MS, PVP_COOLDOWN_MS,
  POSITIONS, FORMATIONS, STADIUM_TIERS, MAX_STADIUM_TIER, COMPETITION_REWARDS, SHOP_ITEMS,
  randInt, clamp, generatePlayer, calcPlayerValue, createNewClub,
  refreshMarketIfNeeded, calcClubPower, simulateFriendly, trainSquad,
  simulateRealMatch, formatMatchReport, buildLiveSteps, narrateLiveMatch, generateNpcClub,
  generateFixtures, initStandings,
  generateKnockoutBracket, advanceKnockout, pickScorer, sleep
};
