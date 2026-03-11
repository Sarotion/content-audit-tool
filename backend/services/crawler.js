const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const CRAWL_TIMEOUT = 8000;
const MAX_PAGES = 10;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ContentAuditBot/1.0; +https://contentaudit.tool)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'cs,en;q=0.9'
};

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// ─── URL helpers ──────────────────────────────────────────────────────────────

function normalizeUrl(url) {
  if (!url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/$/, '');
}

// ─── Page type detection ──────────────────────────────────────────────────────

/**
 * Detect page type from URL pattern only (fast, no HTTP fetch)
 */
function detectTypeFromUrl(url) {
  const u = url.toLowerCase();
  try {
    const urlObj = new URL(u);
    if (urlObj.pathname === '/' || urlObj.pathname === '') return 'homepage';
  } catch {}
  if (/\/(produkt|product|zbozi|item|p\/)/.test(u)) return 'product';
  if (/\/(kategori|category|vypis|collection|c\/)/.test(u)) return 'category';
  if (/\/(blog|clanek|article|novinky|aktualit)/.test(u)) return 'blog';
  if (/\/(o-nas|o-firme|about|o-spolecnosti|kdo-jsme)/.test(u)) return 'about';
  if (/\/(kontakt|contact)/.test(u)) return 'contact';
  if (/\/(sluzby|services|nabidka|reseni|cenik|pricing|co-delame)/.test(u)) return 'service';
  return 'other';
}

/**
 * Detect page type from URL + page content (more accurate)
 */
function detectPageType(url, $) {
  const u = url.toLowerCase();
  try {
    const urlObj = new URL(u);
    if (urlObj.pathname === '/' || urlObj.pathname === '') return 'homepage';
  } catch {}
  if (/\/(produkt|product|zbozi|item)/.test(u) || $('[itemtype*="Product"]').length > 0) return 'product';
  if (/\/(kategori|category|vypis|collection)/.test(u)) return 'category';
  if (/\/(blog|clanek|article|novinky|aktualit)/.test(u)) return 'blog';
  if (/\/(o-nas|o-firme|about|o-spolecnosti|kdo-jsme)/.test(u)) return 'about';
  if (/\/(kontakt|contact)/.test(u)) return 'contact';
  if (/\/(sluzby|services|nabidka|reseni|cenik|pricing)/.test(u)) return 'service';
  return 'other';
}

// ─── Site type detection (e-shop vs website) ──────────────────────────────────

/**
 * Detect whether a site is an e-shop or a regular website
 * based on homepage content signals
 */
function detectSiteType(pageData, $) {
  let score = 0;

  // Cart / checkout links
  if ($('a[href*="/kosik"], a[href*="/cart"], a[href*="/pokladna"], a[href*="/checkout"], a[href*="/nakupni-kosik"]').length > 0) score += 3;

  // Cart-like icons or elements
  if ($('[class*="cart"], [class*="kosik"], [data-cart], [class*="basket"], [id*="cart"], [id*="kosik"]').length > 0) score += 2;

  // E-commerce platform signals
  if ($('[class*="woocommerce"], [class*="shoptet"], [class*="shopify"], [class*="prestashop"]').length > 0) score += 3;

  // Product schema on homepage
  if ((pageData.structuredData || []).flat().some(t => /product|offer/i.test(String(t)))) score += 2;

  // Price elements
  if ($('[class*="price"], [class*="cena"], [itemprop="price"], .wc-Price-amount').length > 2) score += 2;

  // Internal links to product/category pages
  if ((pageData.internalLinks || []).some(l =>
    /\/(produkt|product|zbozi|kategori|category|collection|vypis)/i.test(l.href)
  )) score += 2;

  return score >= 3 ? 'eshop' : 'website';
}

// ─── Crawl priority by site type ─────────────────────────────────────────────

/**
 * Page type slots per site type (max pages of each type to include)
 */
const SLOTS = {
  eshop: { homepage: 1, product: 3, category: 3, blog: 1, about: 1, contact: 1, service: 0, other: 0 },
  website: { homepage: 1, service: 4, blog: 2, about: 1, contact: 1, product: 0, category: 0, other: 1 }
};

/**
 * URL priority score for queue ordering (higher = crawled sooner)
 */
function urlPriorityForType(url, siteType) {
  const u = url.toLowerCase();
  if (siteType === 'eshop') {
    if (/\/(produkt|product|zbozi|item)/.test(u)) return 10;
    if (/\/(kategori|category|vypis|collection)/.test(u)) return 8;
    if (/\/(o-nas|o-firme|about|kontakt|contact)/.test(u)) return 4;
    if (/\/(blog|clanek|article)/.test(u)) return 3;
    return 1;
  } else {
    if (/\/(sluzby|services|nabidka|reseni|cenik|pricing)/.test(u)) return 10;
    if (/\/(o-nas|o-firme|about)/.test(u)) return 7;
    if (/\/(kontakt|contact)/.test(u)) return 6;
    if (/\/(blog|clanek|article|novinky)/.test(u)) return 4;
    return 1;
  }
}

// ─── Data extraction ──────────────────────────────────────────────────────────

function extractInternalLinks($, baseUrl, pageUrl) {
  const origin = new URL(baseUrl).origin;
  const links = new Set();
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      const full = new URL(href, pageUrl).href.split('#')[0].split('?')[0];
      if (full.startsWith(origin) && full !== baseUrl) links.add(full);
    } catch {}
  });
  return [...links];
}

function extractPageData(url, html, $, xRobotsTag = null) {
  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const robots = $('meta[name="robots"]').attr('content') || '';

  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';

  const h1 = $('h1').map((_, el) => $(el).text().trim()).get();
  const h2 = $('h2').map((_, el) => $(el).text().trim()).get();
  const h3 = $('h3').map((_, el) => $(el).text().trim()).get();

  $('script, style, nav, footer, header, .cookie, #cookie, [class*="cookie"], [class*="popup"]').remove();
  const bodyText = $('main, article, .product-description, .category-description, #content, body')
    .first().text().replace(/\s+/g, ' ').trim().slice(0, 3000);

  const images = $('img').map((_, el) => ({
    src: $(el).attr('src') || '',
    alt: $(el).attr('alt') || null
  })).get().slice(0, 30);

  const structuredData = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const d = JSON.parse($(el).html());
      structuredData.push(d['@type'] || (Array.isArray(d) ? d.map(x => x['@type']) : 'Unknown'));
    } catch {}
  });

  const internalLinks = $('a[href]').map((_, el) => ({
    href: $(el).attr('href') || '',
    text: $(el).text().trim().slice(0, 50)
  })).get().filter(l => l.href && !l.href.startsWith('#') && !l.href.startsWith('mailto:')).slice(0, 50);

  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  return {
    url,
    type: detectPageType(url, $),
    title,
    metaDescription,
    canonical,
    robots,
    xRobotsTag,
    ogTitle,
    ogDescription,
    ogImage,
    h1,
    h2,
    h3,
    bodyText,
    wordCount,
    images,
    structuredData,
    internalLinks
  };
}

// ─── Fetch single page ────────────────────────────────────────────────────────

async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: CRAWL_TIMEOUT,
      headers: HEADERS,
      maxRedirects: 5,
      validateStatus: s => s < 500,
      httpsAgent
    });
    if (!response.headers['content-type']?.includes('html')) return null;
    const $ = cheerio.load(response.data);
    const xRobotsTag = response.headers['x-robots-tag'] || null;
    return {
      data: extractPageData(url, response.data, $, xRobotsTag),
      links: extractInternalLinks($, url, url),
      statusCode: response.status,
      $
    };
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err.message);
    return null;
  }
}

// ─── Main crawl ────────────────────────────────────────────────────────────────

async function crawlWebsite(startUrl) {
  const base = normalizeUrl(startUrl);
  const visited = new Set([base]);
  const queue = [base];
  const pages = [];

  let siteType = null;
  let slots = null;
  const typeCounts = { homepage: 0, product: 0, category: 0, blog: 0, about: 0, contact: 0, service: 0, other: 0 };

  console.log(`🕷️  Starting crawl: ${base}`);

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift();

    // After site type is known, skip URLs that would exceed type caps
    if (siteType && slots) {
      const urlType = detectTypeFromUrl(url);
      const limit = slots[urlType] ?? 0;
      if (limit === 0 || typeCounts[urlType] >= limit) {
        // Still crawl if we haven't filled all slots yet (use as fallback 'other')
        const totalFilled = Object.values(typeCounts).reduce((a, b) => a + b, 0);
        if (totalFilled >= MAX_PAGES) continue;
        // Allow if it's an 'other' url and we have remaining capacity
        if (urlType !== 'other') continue;
      }
    }

    console.log(`  Crawling: ${url}`);
    const result = await fetchPage(url);

    if (!result) continue;
    if (result.statusCode === 404) continue;

    const pageType = result.data.type;

    // Detect site type from the first page (homepage)
    if (pages.length === 0) {
      siteType = detectSiteType(result.data, result.$);
      slots = SLOTS[siteType];
      console.log(`  Site type: ${siteType}`);
    }

    // Double-check cap using actual detected page type
    if (siteType && slots) {
      const limit = slots[pageType] ?? 0;
      if (limit > 0 && typeCounts[pageType] >= limit) {
        // Over cap for this type – skip
        continue;
      }
    }

    typeCounts[pageType] = (typeCounts[pageType] || 0) + 1;
    pages.push(result.data);

    // Sort new links by priority for this site type
    const newLinks = result.links
      .filter(l => !visited.has(l))
      .sort((a, b) => urlPriorityForType(b, siteType) - urlPriorityForType(a, siteType));

    for (const link of newLinks.slice(0, 20)) {
      visited.add(link);
      queue.push(link);
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`✅ Crawled ${pages.length} pages | type: ${siteType} | distribution: ${JSON.stringify(typeCounts)}`);
  return { pages, siteType: siteType || 'website' };
}

module.exports = { crawlWebsite, normalizeUrl };
