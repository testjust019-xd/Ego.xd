/**
 * Décor aléatoire Triple Ego
 * - images carrées (assets/random)
 * - stickers animés (assets/stickers)
 */
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', 'assets', 'random');
const STK_DIR = path.join(__dirname, '..', 'assets', 'stickers');

const POOL = {
  all: [], jinwoo: [], gojo: [], nagi: [],
  stickers: [], stickersJinwoo: [], stickersGojo: [], stickersNagi: []
};

function loadPool() {
  if (fs.existsSync(IMG_DIR)) {
    for (const f of fs.readdirSync(IMG_DIR)) {
      if (!/\.(jpe?g|png|webp)$/i.test(f)) continue;
      const full = path.join(IMG_DIR, f);
      POOL.all.push(full);
      if (f.startsWith('jinwoo')) POOL.jinwoo.push(full);
      else if (f.startsWith('gojo')) POOL.gojo.push(full);
      else if (f.startsWith('nagi')) POOL.nagi.push(full);
    }
  }
  if (fs.existsSync(STK_DIR)) {
    for (const f of fs.readdirSync(STK_DIR)) {
      if (!/\.webp$/i.test(f)) continue;
      const full = path.join(STK_DIR, f);
      POOL.stickers.push(full);
      if (f.startsWith('jinwoo')) POOL.stickersJinwoo.push(full);
      else if (f.startsWith('gojo')) POOL.stickersGojo.push(full);
      else if (f.startsWith('nagi')) POOL.stickersNagi.push(full);
    }
  }
}

loadPool();

function pick(arr) {
  if (!arr || !arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function themeKey(themeName) {
  const t = String(themeName || '').toLowerCase();
  if (t.includes('jin') || t.includes('woo') || t.includes('solo') || t.includes('shadow')) return 'jinwoo';
  if (t.includes('gojo') || t.includes('jujutsu') || t.includes('satoru')) return 'gojo';
  if (t.includes('nagi') || t.includes('blue') || t.includes('lock') || t.includes('ego')) return 'nagi';
  return null;
}

function randomDecorImage(themeName = null) {
  const k = themeKey(themeName);
  if (k === 'jinwoo') return pick(POOL.jinwoo) || pick(POOL.all);
  if (k === 'gojo') return pick(POOL.gojo) || pick(POOL.all);
  if (k === 'nagi') return pick(POOL.nagi) || pick(POOL.all);
  return pick(POOL.all);
}

function randomDecorSticker(themeName = null) {
  const k = themeKey(themeName);
  if (k === 'jinwoo') return pick(POOL.stickersJinwoo) || pick(POOL.stickers);
  if (k === 'gojo') return pick(POOL.stickersGojo) || pick(POOL.stickers);
  if (k === 'nagi') return pick(POOL.stickersNagi) || pick(POOL.stickers);
  return pick(POOL.stickers);
}

function maybeDecorImage(chance = 0.45, themeName = null) {
  if (Math.random() > chance) return null;
  return randomDecorImage(themeName);
}

function maybeDecorSticker(chance = 0.35, themeName = null) {
  if (Math.random() > chance) return null;
  return randomDecorSticker(themeName);
}

module.exports = {
  randomDecorImage,
  randomDecorSticker,
  maybeDecorImage,
  maybeDecorSticker,
  POOL
};
