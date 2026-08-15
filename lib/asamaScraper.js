/**
 * Scraper Anime-Sama v4
 * Version production avec URL robuste, cache LRU, logs par niveaux
 * et recherche par similarité
 */

const cheerio = require('cheerio');

// ──────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────

const CONFIG = {
  UA: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  TIMEOUT: 15000,
  CACHE_MAX_SIZE: 100,
  CACHE_TTL: 300000, // 5 minutes
  MAX_RESULTS: 10,
  LOG_LEVEL: 'info', // debug | info | warn | error
};

// ──────────────────────────────────────────────
// LOGGING PAR NIVEAUX
// ──────────────────────────────────────────────

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4,
};

function shouldLog(level) {
  return LOG_LEVELS[level] >= LOG_LEVELS[CONFIG.LOG_LEVEL];
}

function log(level, ...args) {
  if (!shouldLog(level)) return;
  const prefix = {
    debug: '🔍',
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
  }[level] || '📌';
  console.log(`[AnimeSama] ${prefix}`, new Date().toISOString(), ...args);
}

// ──────────────────────────────────────────────
// CACHE LRU
// ──────────────────────────────────────────────

class LRUCache {
  constructor(maxSize = CONFIG.CACHE_MAX_SIZE) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > CONFIG.CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }
    
    // Mettre à jour la position (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key, data) {
    // Si la clé existe déjà, la supprimer
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Si le cache est plein, supprimer l'entrée la plus ancienne
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data: data,
      timestamp: Date.now(),
    });
  }

  clear() {
    this.cache.clear();
  }

  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      keys: Array.from(this.cache.keys()),
    };
  }
}

const cache = new LRUCache();

// ──────────────────────────────────────────────
// UTILITAIRES RÉSEAU
// ──────────────────────────────────────────────

async function fetchHTML(url, timeoutMs = CONFIG.TIMEOUT) {
  const cacheKey = `html:${url}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    log('debug', 'Cache hit for:', url);
    return cached;
  }

  log('debug', 'Fetching:', url);
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': CONFIG.UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
      signal: ctrl.signal,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${res.statusText}`);
    }

    const html = await res.text();
    
    if (!html || html.length < 100) {
      throw new Error('Response too short or empty');
    }

    cache.set(cacheKey, html);
    log('debug', 'Fetched:', url, `(${html.length} bytes)`);
    return html;
  } catch (error) {
    log('error', 'Failed to fetch:', url, error.message);
    throw error;
  } finally {
    clearTimeout(t);
  }
}

// ──────────────────────────────────────────────
// UTILITAIRES URL ROBUSTES
// ──────────────────────────────────────────────

function normalizeUrl(base, path) {
  if (!path) return base;
  
  // Si c'est déjà une URL complète
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Si c'est un protocole relatif
  if (path.startsWith('//')) {
    return 'https:' + path;
  }
  
  // Utiliser l'API URL pour une construction robuste
  try {
    // S'assurer que la base a un slash final pour l'URL résolution
    const baseUrl = base.endsWith('/') ? base : base + '/';
    const resolved = new URL(path, baseUrl);
    return resolved.toString();
  } catch (error) {
    log('warn', 'URL normalization failed:', error.message, 'base:', base, 'path:', path);
    // Fallback simple
    return base.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  }
}

// ──────────────────────────────────────────────
// DÉTECTION INTELLIGENTE DU DOMAINE
// ──────────────────────────────────────────────

async function findSiteUrl() {
  const cacheKey = 'siteUrl';
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  log('info', 'Finding active Anime-Sama domain...');

  // Domaines officiels connus
  const knownDomains = [
    'https://anime-sama.si',
    'https://anime-sama.to',
    'https://anime-sama.org',
    'https://anime-sama.tv',
    'https://anime-sama.fr',
  ];

  let activeDomains = [];

  // 1. Essayer le redirecteur officiel
  try {
    log('debug', 'Checking redirector...');
    const html = await fetchHTML('https://anime-sama.pw/', 8000);
    const $ = cheerio.load(html);
    const link = $('a[href*="anime-sama"]').first().attr('href');
    if (link) {
      try {
        const base = new URL(link).origin;
        if (base && !base.includes('anime-sama.pw')) {
          activeDomains.push(base);
          log('debug', 'Found redirect target:', base);
        }
      } catch (_) {}
    }
  } catch (error) {
    log('warn', 'Redirector check failed:', error.message);
  }

  // 2. Ajouter les domaines connus
  activeDomains = [...activeDomains, ...knownDomains];

  // 3. Tester chaque domaine
  for (const base of activeDomains) {
    try {
      log('debug', 'Testing domain:', base);
      const html = await fetchHTML(base + '/', 6000);
      const $ = cheerio.load(html);
      
      // Vérifier plusieurs indicateurs
      const hasContent = {
        title: $('title').text().toLowerCase().includes('anime-sama'),
        catalogue: $('a[href*="catalogue"]').length > 0,
        animeElements: $('[class*="anime"], [class*="catalogue"]').length > 5,
        episodes: $('[class*="episode"], a[href*="episode"]').length > 0,
        search: $('input[type="search"], input[name*="search"]').length > 0,
      };

      const score = Object.values(hasContent).filter(Boolean).length;
      log('debug', `Domain ${base} score: ${score}/5`, hasContent);

      if (score >= 3) {
        const normalized = base.replace(/\/$/, '');
        cache.set(cacheKey, normalized);
        log('info', 'Selected domain:', normalized);
        return normalized;
      }
    } catch (error) {
      log('debug', 'Domain test failed:', base, error.message);
    }
  }

  // Fallback
  log('warn', 'No active domain found, using fallback');
  const fallback = 'https://anime-sama.si';
  cache.set(cacheKey, fallback);
  return fallback;
}

// ──────────────────────────────────────────────
// RECHERCHE PAR SIMILARITÉ
// ──────────────────────────────────────────────

function calculateSimilarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // Si une chaîne est vide
  if (!s1 || !s2) return 0;
  
  // Si une chaîne contient l'autre
  if (s1.includes(s2) || s2.includes(s1)) {
    return Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length);
  }
  
  // Calculer la distance de Levenshtein simplifiée
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  let matches = 0;
  const used = new Set();
  
  for (const w1 of words1) {
    if (w1.length < 2) continue;
    for (let i = 0; i < words2.length; i++) {
      if (used.has(i)) continue;
      const w2 = words2[i];
      if (w2.length < 2) continue;
      if (w1 === w2 || w1.includes(w2) || w2.includes(w1)) {
        matches++;
        used.add(i);
        break;
      }
    }
  }
  
  const maxWords = Math.max(words1.length, words2.length);
  return maxWords > 0 ? matches / maxWords : 0;
}

async function searchAnime(query, siteUrl, limit = CONFIG.MAX_RESULTS) {
  const cacheKey = `search:${query.toLowerCase()}:${limit}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    log('debug', 'Search cache hit for:', query);
    return cached;
  }

  log('info', 'Searching for:', query);
  const url = `${siteUrl}/catalogue/?search=${encodeURIComponent(query)}`;
  let html;

  try {
    html = await fetchHTML(url);
  } catch (error) {
    log('error', 'Search fetch failed:', error.message);
    return [];
  }

  const $ = cheerio.load(html);
  const animeLinks = [];
  const seen = new Set();

  // Récupérer TOUS les liens du catalogue
  $('a[href*="/catalogue/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    if (!href || href.includes('?')) return;
    
    const slug = href.match(/\/catalogue\/([^\/?]+)/)?.[1];
    if (!slug || seen.has(slug)) return;
    
    const title = cleanText($el.text() || $el.find('h2, h3, .title, .name').first().text());
    if (!title || title.length < 2) return;
    
    seen.add(slug);
    animeLinks.push({
      title,
      slug,
      url: normalizeUrl(siteUrl, href),
      elements: [el],
    });
  });

  // Enrichir avec les éléments qui n'ont pas de texte direct
  if (animeLinks.length === 0) {
    $('a[href*="/catalogue/"]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      if (!href || href.includes('?')) return;
      
      const slug = href.match(/\/catalogue\/([^\/?]+)/)?.[1];
      if (!slug || seen.has(slug)) return;
      
      const title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      seen.add(slug);
      animeLinks.push({
        title,
        slug,
        url: normalizeUrl(siteUrl, href),
        elements: [el],
      });
    });
  }

  // Calculer le score de similarité avec la requête
  const results = animeLinks.map(item => ({
    ...item,
    similarity: calculateSimilarity(query, item.title),
  }));

  // Trier par similarité décroissante
  results.sort((a, b) => b.similarity - a.similarity);

  // Prendre les meilleurs résultats
  const topResults = results
    .filter(r => r.similarity > 0.1)
    .slice(0, limit)
    .map(({ title, slug, url }) => ({ title, slug, url }));

  log('info', `Found ${topResults.length} results for:`, query);
  cache.set(cacheKey, topResults);
  return topResults;
}

// ──────────────────────────────────────────────
// RÉCUPÉRATION DES SAISONS
// ──────────────────────────────────────────────

async function getSeasons(animeUrl) {
  const cacheKey = `seasons:${animeUrl}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    log('debug', 'Seasons cache hit for:', animeUrl);
    return cached;
  }

  log('info', 'Getting seasons for:', animeUrl);
  let html;

  try {
    html = await fetchHTML(animeUrl);
  } catch (error) {
    log('error', 'Season fetch failed:', error.message);
    return [];
  }

  const $ = cheerio.load(html);
  const seasons = [];
  const seen = new Set();

  // Méthode 1: panneauAnime
  const scriptText = $('script').text();
  const panneauMatches = scriptText.match(/panneauAnime\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g);

  if (panneauMatches) {
    for (const match of panneauMatches) {
      const parts = match.match(/panneauAnime\s*\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/);
      if (parts) {
        const name = cleanText(parts[1]);
        let path = parts[2].trim().replace(/^\//, '');

        if (name && path && name.length >= 2 && !seen.has(path)) {
          seen.add(path);
          const lang = detectLanguage(path);
          const basePath = path.replace(/(vostfr|vf|va|vkr|vcn|vq|vf1|vf2|multi)\/?$/i, '').replace(/\/$/, '');

          seasons.push({
            name: name,
            path: basePath || path,
            fullPath: path,
            lang: lang,
            url: normalizeUrl(animeUrl, path),
          });
        }
      }
    }
  }

  // Méthode 2: Liens de saisons
  if (seasons.length === 0) {
    const seasonSelectors = [
      'a[href*="saison"]', 'a[href*="season"]',
      'a[class*="saison"]', 'a[class*="season"]',
      '.season-list a', '.saison-list a',
      '[class*="season"] a', '[class*="saison"] a',
    ];

    for (const sel of seasonSelectors) {
      $(sel).each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const name = cleanText($el.text() || $el.find('span, .name').text());

        if (href && name && name.length >= 2) {
          const path = href.replace(/^\//, '');
          if (!seen.has(path)) {
            seen.add(path);
            const lang = detectLanguage(path);
            const basePath = path.replace(/(vostfr|vf|va|vkr|vcn|vq|vf1|vf2|multi)\/?$/i, '').replace(/\/$/, '');

            seasons.push({
              name: name,
              path: basePath || path,
              fullPath: path,
              lang: lang,
              url: normalizeUrl(animeUrl, href),
            });
          }
        }
      });
    }
  }

  // Méthode 3: Détection automatique
  if (seasons.length === 0) {
    $('div[class*="saison"], div[class*="season"]').each((_, el) => {
      const $el = $(el);
      const links = $el.find('a');
      if (links.length > 0) {
        links.each((_, link) => {
          const $link = $(link);
          const href = $link.attr('href');
          const name = cleanText($link.text());

          if (href && name && name.length >= 2) {
            const path = href.replace(/^\//, '');
            if (!seen.has(path)) {
              seen.add(path);
              const lang = detectLanguage(path);
              seasons.push({
                name: name,
                path: path,
                fullPath: path,
                lang: lang,
                url: normalizeUrl(animeUrl, href),
              });
            }
          }
        });
      }
    });
  }

  // Si pas de saisons mais des épisodes directs
  if (seasons.length === 0) {
    const hasEpisodes = $('a[href*="episode"], a[href*="Episode"], .episode-item').length > 0;
    if (hasEpisodes) {
      seasons.push({
        name: 'Tous les épisodes',
        path: '',
        fullPath: '',
        lang: null,
        url: animeUrl,
      });
    }
  }

  log('info', `Found ${seasons.length} seasons for:`, animeUrl);
  cache.set(cacheKey, seasons);
  return seasons;
}

// ──────────────────────────────────────────────
// RÉCUPÉRATION DES ÉPISODES
// ──────────────────────────────────────────────

async function getEpisodes(seasonUrl) {
  const cacheKey = `episodes:${seasonUrl}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    log('debug', 'Episodes cache hit for:', seasonUrl);
    return cached;
  }

  log('info', 'Getting episodes for:', seasonUrl);
  let html;

  try {
    html = await fetchHTML(seasonUrl);
  } catch (error) {
    log('error', 'Episode fetch failed:', error.message);
    return [];
  }

  const $ = cheerio.load(html);
  const episodes = [];
  const seenUrls = new Set();

  // Méthode 1: episodes.js
  const jsUrls = [];
  $('script[src*="episodes.js"]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) jsUrls.push(normalizeUrl(seasonUrl, src));
  });

  if (jsUrls.length === 0) {
    const scripts = $('script').text();
    const matches = scripts.match(/src=["']([^"']*episodes\.js[^"']*)["']/g);
    if (matches) {
      for (const match of matches) {
        const src = match.match(/["']([^"']*)["']/)?.[1];
        if (src) jsUrls.push(normalizeUrl(seasonUrl, src));
      }
    }
  }

  for (const jsUrl of jsUrls) {
    try {
      const jsContent = await fetchHTML(jsUrl);
      const parsed = parseEpisodesJS(jsContent);
      if (parsed && Object.keys(parsed).length > 0) {
        const epData = buildEpisodesFromData(parsed);
        if (epData.length > 0) {
          episodes.push(...epData);
          log('info', `Found ${epData.length} episodes from JS`);
          break;
        }
      }
    } catch (error) {
      log('warn', 'Failed to parse episodes.js:', error.message);
    }
  }

  // Méthode 2: Liens d'épisodes HTML
  if (episodes.length === 0) {
    const episodeSelectors = [
      'a[href*="episode"]', 'a[href*="Episode"]',
      'a[class*="episode"]', 'a[class*="Episode"]',
      '.episode-list a', '.episode-item a',
      '[class*="episode"] a', '[class*="Episode"] a',
    ];

    for (const sel of episodeSelectors) {
      $(sel).each((_, el) => {
        const $el = $(el);
        const href = $el.attr('href');
        const title = cleanText($el.text() || $el.find('.title, .name').text());

        if (href && title && title.length >= 2) {
          const url = normalizeUrl(seasonUrl, href);
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            const num = extractEpisodeNumber(title);
            episodes.push({
              num: num,
              title: title,
              players: [{ name: 'Lien direct', url: url }],
            });
          }
        }
      });
    }
  }

  // Méthode 3: Iframes de players
  if (episodes.length === 0) {
    const iframeSelectors = [
      'iframe[src*="player"]', 'iframe[src*="video"]',
      'iframe[class*="player"]', 'iframe[class*="video"]',
      '.player iframe', '.video-player iframe',
      '[class*="player"] iframe', '[class*="video"] iframe',
    ];

    for (const sel of iframeSelectors) {
      $(sel).each((_, el) => {
        const $el = $(el);
        let src = $el.attr('src') || $el.attr('data-src');
        if (src) {
          const url = normalizeUrl(seasonUrl, src);
          if (!seenUrls.has(url)) {
            seenUrls.add(url);
            const name = extractPlayerName(url);
            episodes.push({
              num: episodes.length + 1,
              title: `Épisode ${episodes.length + 1}`,
              players: [{ name, url }],
            });
          }
        }
      });
    }
  }

  // Enrichir les épisodes
  for (const ep of episodes) {
    if (ep.players.length === 1 && ep.players[0].name === 'Lien direct') {
      try {
        const enriched = await enrichEpisodePlayers(ep.players[0].url);
        if (enriched.length > 0) {
          ep.players = enriched;
        }
      } catch (error) {
        log('warn', 'Failed to enrich episode players:', error.message);
      }
    }
  }

  episodes.sort((a, b) => a.num - b.num);

  log('info', `Found ${episodes.length} episodes for:`, seasonUrl);
  cache.set(cacheKey, episodes);
  return episodes;
}

// ──────────────────────────────────────────────
// FONCTIONS UTILITAIRES (COMPLÉTÉES)
// ──────────────────────────────────────────────

function cleanText(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function detectLanguage(path) {
  const match = path.match(/(vostfr|vf|va|vkr|vcn|vq|vf1|vf2|multi)\/?$/i);
  return match ? match[1].toLowerCase() : null;
}

function extractEpisodeNumber(title) {
  const match = title.match(/\b(\d+)\b/);
  return match ? parseInt(match[1]) : 1;
}

function extractPlayerName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length >= 2) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    }
    return 'Player';
  } catch {
    return 'Player';
  }
}

async function enrichEpisodePlayers(url) {
  try {
    const html = await fetchHTML(url, 10000);
    const $ = cheerio.load(html);
    const players = [];

    const iframeSelectors = [
      'iframe[src*="player"]', 'iframe[src*="video"]',
      'iframe[class*="player"]', 'iframe[class*="video"]',
      '.player iframe', '.video-player iframe',
      '[class*="player"] iframe', '[class*="video"] iframe',
    ];

    for (const sel of iframeSelectors) {
      $(sel).each((_, el) => {
        const src = $(el).attr('src');
        if (src) {
          const playerUrl = normalizeUrl(url, src);
          const name = extractPlayerName(playerUrl);
          players.push({ name, url: playerUrl });
        }
      });
    }

    return players;
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// PARSEUR episodes.js (COMPLET)
// ──────────────────────────────────────────────

function parseEpisodesJS(content) {
  const result = {};

  // Patterns de base
  const patterns = [
    // eps1 = ["url1", "url2"]
    /(?:var\s+)?eps(\d*)\s*=\s*\[([\s\S]*?)\];/gi,
    // eps = { 1: "url1", 2: "url2" }
    /(?:var\s+)?eps\s*=\s*\{([\s\S]*?)\}/gi,
    // episodes = ["url1", "url2"]
    /(?:var\s+)?(?:episodes|lecteurs|players|links)\s*=\s*\[([\s\S]*?)\];/gi,
    // episodes = { 1: "url1", 2: "url2" }
    /(?:var\s+)?(?:episodes|lecteurs|players|links)\s*=\s*\{([\s\S]*?)\}/gi,
  ];

  for (const pattern of patterns) {
    let match;
    const matches = content.matchAll(pattern);
    let found = false;

    for (match of matches) {
      if (match.length >= 2) {
        const key = match[1] || '1';
        const value = match[2] || match[1] || '';

        if (value.includes('[') || value.includes(']')) {
          // C'est un tableau
          const urls = [...value.matchAll(/["'](https?:\/\/[^"']+)["']/g)].map(x => x[1]);
          if (urls.length > 0) {
            result[key] = urls;
            found = true;
          }
        } else if (value.includes('{') || value.includes('}')) {
          // C'est un objet
          const pairs = value.matchAll(/["'](\d+)["']\s*:\s*["']([^"']+)["']/g);
          for (const pair of pairs) {
            const k = pair[1];
            const url = pair[2];
            if (!result[k]) result[k] = [];
            result[k].push(url);
            found = true;
          }
        } else {
          // C'est une liste simple
          const urls = [...value.matchAll(/["'](https?:\/\/[^"']+)["']/g)].map(x => x[1]);
          if (urls.length > 0) {
            result[key] = urls;
            found = true;
          }
        }
      }
    }

    if (found) break;
  }

  // Si aucun pattern ne fonctionne, extraire toutes les URLs
  if (Object.keys(result).length === 0) {
    const allUrls = [...content.matchAll(/["'](https?:\/\/[^"']+)["']/g)].map(x => x[1]);
    if (allUrls.length > 0) {
      result['1'] = allUrls;
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

function buildEpisodesFromData(data) {
  const episodes = [];

  // Trier les clés par numéro
  const keys = Object.keys(data)
    .filter(k => !isNaN(parseInt(k)))
    .map(Number)
    .sort((a, b) => a - b);

  for (const key of keys) {
    const urls = data[String(key)] || [];
    if (urls.length === 0) continue;

    const players = urls.map(url => ({
      name: extractPlayerName(url),
      url: url,
    }));

    episodes.push({
      num: key,
      title: `Épisode ${key}`,
      players: players,
    });
  }

  // Si un seul tableau avec tous les players
  if (episodes.length === 0 && data['1'] && data['1'].length > 0) {
    episodes.push({
      num: 1,
      title: 'Épisode',
      players: data['1'].map(url => ({
        name: extractPlayerName(url),
        url: url,
      })),
    });
  }

  return episodes;
}

// ──────────────────────────────────────────────
// EXPORT
// ──────────────────────────────────────────────

module.exports = {
  findSiteUrl,
  searchAnime,
  getSeasons,
  getEpisodes,
  // Exports pour debug
  cache,
  CONFIG,
  log,
};
    