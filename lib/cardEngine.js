/**
 * Système de cartes collectionnables
 * Raretés : common < rare < epic < legendary
 */

const RARITIES = {
  common:    { label: 'Commun',    emoji: '⚪', weight: 55, sellMin: 15,  sellMax: 40 },
  rare:      { label: 'Rare',      emoji: '🔵', weight: 28, sellMin: 60,  sellMax: 120 },
  epic:      { label: 'Épique',    emoji: '🟣', weight: 12, sellMin: 180, sellMax: 350 },
  legendary: { label: 'Légendaire',emoji: '🟡', weight: 5,  sellMin: 500, sellMax: 1200 }
};

const CARD_POOL = [
  // Commun
  { id: 'foot_ball', name: 'Ballon classique', rarity: 'common', series: 'Sport' },
  { id: 'foot_boot', name: 'Crampons usés', rarity: 'common', series: 'Sport' },
  { id: 'city_taxi', name: 'Taxi jaune', rarity: 'common', series: 'Ville' },
  { id: 'food_attiéké', name: 'Attiéké poisson', rarity: 'common', series: 'Food' },
  { id: 'music_radio', name: 'Radio FM', rarity: 'common', series: 'Music' },
  { id: 'nature_palm', name: 'Palmier', rarity: 'common', series: 'Nature' },
  { id: 'tech_phone', name: 'Téléphone basique', rarity: 'common', series: 'Tech' },
  { id: 'anime_fan', name: 'Badge anime', rarity: 'common', series: 'Anime' },
  // Rare
  { id: 'foot_stadium', name: 'Stade plein', rarity: 'rare', series: 'Sport' },
  { id: 'foot_captain', name: 'Brassard capitaine', rarity: 'rare', series: 'Sport' },
  { id: 'city_lagune', name: 'Coucher de soleil lagune', rarity: 'rare', series: 'Ville' },
  { id: 'music_vinyl', name: 'Vinyle rare', rarity: 'rare', series: 'Music' },
  { id: 'tech_drone', name: 'Drone pro', rarity: 'rare', series: 'Tech' },
  { id: 'anime_hero', name: 'Héros masqué', rarity: 'rare', series: 'Anime' },
  { id: 'nature_baobab', name: 'Baobab centenaire', rarity: 'rare', series: 'Nature' },
  // Épique
  { id: 'foot_golden', name: 'Ballon d\'or', rarity: 'epic', series: 'Sport' },
  { id: 'music_studio', name: 'Studio légendaire', rarity: 'epic', series: 'Music' },
  { id: 'tech_ai', name: 'Noyau IA', rarity: 'epic', series: 'Tech' },
  { id: 'anime_shadow', name: 'Ombre du monarque', rarity: 'epic', series: 'Anime' },
  { id: 'city_skyline', name: 'Skyline futuriste', rarity: 'epic', series: 'Ville' },
  // Légendaire
  { id: 'arise_crown', name: 'Couronne ARISE', rarity: 'legendary', series: 'Mythique' },
  { id: 'foot_worldcup', name: 'Coupe du Monde', rarity: 'legendary', series: 'Sport' },
  { id: 'shadow_monarch', name: 'Sung le Monarque', rarity: 'legendary', series: 'Anime' },
  { id: 'phoenix_gold', name: 'Phénix doré', rarity: 'legendary', series: 'Mythique' }
];

const PACK_COST = 100;
const PACK_SIZE = 3;
const PACK_COOLDOWN_MS = 20 * 1000;

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rollRarity() {
  const total = Object.values(RARITIES).reduce((s, r) => s + r.weight, 0);
  let r = Math.random() * total;
  for (const [key, meta] of Object.entries(RARITIES)) {
    r -= meta.weight;
    if (r <= 0) return key;
  }
  return 'common';
}

function pickCardOfRarity(rarity) {
  const pool = CARD_POOL.filter(c => c.rarity === rarity);
  return pool[randInt(0, pool.length - 1)];
}

function openPack() {
  const cards = [];
  for (let i = 0; i < PACK_SIZE; i++) {
    const rarity = rollRarity();
    const base = pickCardOfRarity(rarity);
    const meta = RARITIES[rarity];
    const sellValue = randInt(meta.sellMin, meta.sellMax);
    cards.push({
      uid: `${Date.now().toString(36)}_${randInt(1000, 9999)}_${i}`,
      id: base.id,
      name: base.name,
      rarity,
      series: base.series,
      sellValue,
      obtainedAt: Date.now()
    });
  }
  return cards;
}

function sellPrice(card) {
  return card.sellValue || RARITIES[card.rarity]?.sellMin || 10;
}

function formatCard(card, index = null) {
  const meta = RARITIES[card.rarity] || RARITIES.common;
  const prefix = index !== null ? `${index}. ` : '';
  return `${prefix}${meta.emoji} *${card.name}* (${meta.label}) — ${card.series} · vendable ${sellPrice(card)} pts`;
}

function collectionStats(cards) {
  const counts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (const c of cards) {
    if (counts[c.rarity] !== undefined) counts[c.rarity]++;
  }
  return counts;
}

module.exports = {
  RARITIES, CARD_POOL, PACK_COST, PACK_SIZE, PACK_COOLDOWN_MS,
  openPack, sellPrice, formatCard, collectionStats, rollRarity
};
