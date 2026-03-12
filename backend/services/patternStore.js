/**
 * patternStore.js – URL pattern learning database
 *
 * Stores per-domain URL structure patterns derived from user-provided hint URLs.
 * Used to automatically identify product, category, and blog pages on Czech e-shops
 * without relying solely on URL keyword matching.
 *
 * Storage: JSON file at backend/data/url-patterns.json
 * Note: File is reset on Railway redeploy. Future upgrade: use persistent DB.
 *
 * Format:
 * {
 *   "ketris.cz": {
 *     "category": "_k\\d+",
 *     "product":  "_z\\d+",
 *     "blog":     "/clanek/\\d+",
 *     "source":   "user-hint",
 *     "updatedAt": "2026-03-12",
 *     "samples": {
 *       "category": "https://ketris.cz/chov-drubeze_k166/",
 *       "product":  "https://ketris.cz/bateriovy-zdroj_z9540/"
 *     }
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '../data/url-patterns.json');

function loadStore() {
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveStore(data) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('[patternStore] Failed to save:', err.message);
  }
}

/**
 * Derive a regex pattern string from a hint URL.
 * Returns a string that can be used with new RegExp(pattern).
 */
function derivePattern(hintUrl) {
  try {
    const path = new URL(hintUrl).pathname.toLowerCase();

    // Shoptet: suffix _k{id} = category, _z{id} = product
    if (/_k\d+(\/|$)/.test(path)) return '_k\\d+';
    if (/_z\d+(\/|$)/.test(path)) return '_z\\d+';

    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return null;

    // Pattern like /clanek/81/title or /blog/123/ → /{segment}/\d+
    if (segments.length >= 2 && /^\d+$/.test(segments[1])) {
      return `/${segments[0]}/\\d+`;
    }

    // Pattern like /product/slug/ or /kategorie/slug/ → /{first-segment}/
    return `/${segments[0]}/`;
  } catch {
    return null;
  }
}

/**
 * Extract hostname without www prefix.
 */
function toDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Save hint-derived patterns for a domain.
 * hints: { category?: string, product?: string, blog?: string } – raw hint URLs
 */
function savePatterns(siteUrl, hints) {
  const domain = toDomain(siteUrl);
  if (!domain) return;

  const store = loadStore();
  const existing = store[domain] || {};

  const entry = {
    ...existing,
    source: 'user-hint',
    updatedAt: new Date().toISOString().slice(0, 10),
    samples: existing.samples || {}
  };

  if (hints.category) {
    const p = derivePattern(hints.category);
    if (p) { entry.category = p; entry.samples.category = hints.category; }
  }
  if (hints.product) {
    const p = derivePattern(hints.product);
    if (p) { entry.product = p; entry.samples.product = hints.product; }
  }
  if (hints.blog) {
    const p = derivePattern(hints.blog);
    if (p) { entry.blog = p; entry.samples.blog = hints.blog; }
  }

  store[domain] = entry;
  saveStore(store);
  console.log(`[patternStore] Saved patterns for ${domain}:`, { category: entry.category, product: entry.product, blog: entry.blog });
}

/**
 * Get stored patterns for a domain (if any).
 * Returns { category?, product?, blog? } regex strings or null.
 */
function getPatterns(siteUrl) {
  const domain = toDomain(siteUrl);
  if (!domain) return null;
  const store = loadStore();
  const entry = store[domain];
  if (!entry) return null;
  const result = {};
  if (entry.category) result.category = entry.category;
  if (entry.product) result.product = entry.product;
  if (entry.blog) result.blog = entry.blog;
  return Object.keys(result).length ? result : null;
}

/**
 * Build hint patterns from raw hint URLs (without saving).
 * Used inline during audit when user provided hints.
 */
function buildPatterns(hints) {
  const result = {};
  if (hints?.category) { const p = derivePattern(hints.category); if (p) result.category = p; }
  if (hints?.product)  { const p = derivePattern(hints.product);  if (p) result.product  = p; }
  if (hints?.blog)     { const p = derivePattern(hints.blog);     if (p) result.blog     = p; }
  return Object.keys(result).length ? result : null;
}

module.exports = { savePatterns, getPatterns, buildPatterns, derivePattern };
