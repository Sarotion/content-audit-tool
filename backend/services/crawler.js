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

  // ── URL-based detection (fast path) ──────────────────────────────────────
  if (/\/(produkt|product|zbozi|item)/.test(u)) return 'product';
  if (/\/(kategori|category|vypis|collection)/.test(u)) return 'category';
  if (/\/(blog|clanek|article|novinky|aktualit)/.test(u)) return 'blog';
  if (/\/(o-nas|o-firme|about|o-spolecnosti|kdo-jsme)/.test(u)) return 'about';
  if (/\/(kontakt|contact)/.test(u)) return 'contact';
  if (/\/(sluzby|services|nabidka|reseni|cenik|pricing)/.test(u)) return 'service';

  // ── Content-based fallbacks (for Czech e-shops with non-standard URL slugs) ─
  // Product page: Schema.org Product type or add-to-cart button
  if ($('[itemtype*="schema.org/Product"], [itemtype*="Product"]').length > 0) return 'product';
  if ($('[class*="add-to-cart"], [class*="do-kosiku"], [class*="pridat-do-kosiku"], [data-action*="cart"], form[action*="kosik"], form[action*="cart"]').length > 0) return 'product';
  // Category/listing page: multiple product tiles visible on one page
  if ($('[class*="product-item"], [class*="product-card"], [class*="item-product"], [data-product-id], [class*="product-tile"]').length >= 4) return 'category';

  return 'other';
}

// ─── Site type detection (e-shop vs website) ──────────────────────────────────

/**
 * Detect whether a site is an e-shop or a regular website
 * based on homepage content signals. Uses a wide range of heuristics
 * to handle platforms like Shoptet, WooCommerce, custom builds, etc.
 */
function detectSiteType(pageData, $) {
  let score = 0;

  // ── Strong e-shop signals (each +3) ──────────────────────────────────────

  // Explicit cart / checkout links in anchor hrefs
  if ($('a[href*="/kosik"], a[href*="/cart"], a[href*="/pokladna"], a[href*="/checkout"], a[href*="/nakupni-kosik"], a[href*="/objednavka"]').length > 0) score += 3;

  // E-commerce platform CSS fingerprints
  if ($('[class*="woocommerce"], [class*="shoptet"], [class*="shopify"], [class*="prestashop"], [class*="opencart"], [class*="magento"]').length > 0) score += 3;

  // Product schema markup (very reliable)
  if ((pageData.structuredData || []).flat().some(t => /product|offer|shoppingcart/i.test(String(t)))) score += 3;

  // ── Moderate signals (each +2) ────────────────────────────────────────────

  // Cart-related elements (class/id/data attributes)
  if ($('[class*="cart"], [class*="kosik"], [data-cart], [class*="basket"], [id*="cart"], [id*="kosik"], [class*="nakupni-kosik"]').length > 0) score += 2;

  // Price elements or itemprop price
  if ($('[class*="price"], [class*="cena"], [itemprop="price"], [class*="kc"], [class*="kcs"], .wc-Price-amount, [data-price]').length > 1) score += 2;

  // Internal links to typical e-shop URL patterns (products/categories)
  const internalLinks = pageData.internalLinks || [];
  const eshopLinkCount = internalLinks.filter(l =>
    /\/(produkt|product|zbozi|item|kategori|category|collection|vypis|obchod|shop\/)/i.test(l.href)
  ).length;
  if (eshopLinkCount >= 3) score += 3;
  else if (eshopLinkCount >= 1) score += 2;

  // Links to shipping / payment pages
  if (internalLinks.some(l => /\/(doprava|platba|dodani|payment|shipping|dopravni-podminky)/i.test(l.href))) score += 2;

  // ── Weak signals (each +1) ────────────────────────────────────────────────

  // "Add to cart" button text anywhere on page
  const bodyText = pageData.bodyText || '';
  if (/přidat do košíku|do košíku|koupit|add to cart|in den warenkorb/i.test(bodyText)) score += 2;

  // Currency mention in page text (prices listed)
  if (/\d+[\s\u00A0]*(Kč|EUR|€|\$)/i.test(bodyText)) score += 1;

  // Navigation / menu contains shop-like words
  const navText = $('nav, [role="navigation"], .menu, .navigation, .navbar, header').text();
  if (/košík|cart|katalog|produkty|obchod|eshop|hledat.*zboží/i.test(navText)) score += 2;

  // Input for quantity (typical on product / category pages)
  if ($('input[type="number"][name*="qty"], input[name*="quantity"], input[name*="mnozstvi"]').length > 0) score += 2;

  // ── Navigation link text analysis ─────────────────────────────────────────
  // Checks link TEXT (not just href) in navigation – works even when cart/prices
  // are rendered by JavaScript, because navigation is almost always server-rendered.
  const navLinkTexts = [];
  $('nav a, header a, [role="navigation"] a, .menu a, #menu a, .main-menu a, .top-menu a, .nav-menu a, .navbar a').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length >= 2 && text.length <= 40) navLinkTexts.push(text);
  });
  const CZ_PRODUCT_CAT_RE = /hračky|hračka|lego|stavebnice|puzzle|dárek|dárky|elektronika|oblečení|móda|obuv|boty|nábytek|sport|zahrada|kuchyně|domácnost|kosmetika|doplňky|autodoplňky|kola|knihy|hry|vláčky|chovatel|modelářství|outdoor|rybolov|potraviny|drogerie|nářadí|nástroje|svítidla|textil|parfum|hračky|panenky|auta|roboti|stavebnic/i;
  const catNavCount = navLinkTexts.filter(t => CZ_PRODUCT_CAT_RE.test(t)).length;
  if (catNavCount >= 3) score += 4;       // Multiple product category names in nav → very strong signal
  else if (catNavCount >= 2) score += 2;
  else if (catNavCount >= 1) score += 1;
  // Large number of nav items usually means a product catalog, not a service website
  if (navLinkTexts.length >= 10) score += 2;
  else if (navLinkTexts.length >= 7) score += 1;
  console.log(`  Nav links: ${navLinkTexts.length} total, ${catNavCount} product-category-sounding`);

  // ── Product listing containers ────────────────────────────────────────────
  // Product grids / lists with multiple product tiles
  if ($('[class*="product-grid"], [class*="product-list"], [class*="products-wrap"], [class*="produkty"], ul.products').length > 0) score += 2;
  if ($('[class*="product-item"], [class*="item-product"], [data-product-id], [data-product]').length >= 3) score += 2;

  // Sale / discount / new badges common on e-shop homepages
  if ($('[class*="sale-badge"], [class*="badge-sale"], [class*="sleva"], [class*="akce-"], .label-sale, .label-new').length > 0) score += 1;

  console.log(`  E-shop detection score: ${score} (threshold ≥3)`);
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

  // ⚠️ Extract structured data and internal links BEFORE removing nav/scripts,
  // otherwise nav links and LD+JSON would be lost ($.remove() mutates in place).
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

  // Strip noise elements so bodyText only contains meaningful content
  $('script, style, nav, footer, header, .cookie, #cookie, [class*="cookie"], [class*="popup"]').remove();
  const bodyText = $('main, article, .product-description, .category-description, #content, body')
    .first().text().replace(/\s+/g, ' ').trim().slice(0, 3000);

  const images = $('img').map((_, el) => ({
    src: $(el).attr('src') || '',
    alt: $(el).attr('alt') || null
  })).get().slice(0, 30);

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
    const xRobotsTag = response.headers['x-robots-tag'] || null;

    // Use two separate cheerio instances from the same HTML:
    //   $  – pristine DOM kept for link extraction + detectSiteType (nav/header intact)
    //   $c – will be mutated by extractPageData (removes nav/header for clean bodyText)
    // Without this split, extractPageData's $.remove() strips nav BEFORE extractInternalLinks
    // runs, causing navigation links (categories, products) to be lost from the crawl queue.
    const $ = cheerio.load(response.data);   // pristine – for links & site-type detection
    const $c = cheerio.load(response.data);  // will be stripped – for page content only

    return {
      data: extractPageData(url, response.data, $c, xRobotsTag),
      links: extractInternalLinks($, url, url),
      statusCode: response.status,
      $  // pristine DOM passed to detectSiteType – can see nav, header, cart icons
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

  // Two-tier queue:
  //   primaryQueue – preferred pages (respects type caps; crawled first)
  //   spillQueue   – pages deferred by caps (crawled as fill when primary is empty)
  // This guarantees we always reach MAX_PAGES even when an e-shop uses
  // non-standard URL slugs that don't match our product/category patterns.
  const primaryQueue = [base];
  const spillQueue = [];
  const pages = [];

  let siteType = null;
  let slots = null;
  const typeCounts = { homepage: 0, product: 0, category: 0, blog: 0, about: 0, contact: 0, service: 0, other: 0 };

  console.log(`🕷️  Starting crawl: ${base}`);

  while (pages.length < MAX_PAGES) {
    // Pick from primary queue first; fall back to spill queue as fill
    let url, fromSpill;
    if (primaryQueue.length > 0) {
      url = primaryQueue.shift(); fromSpill = false;
    } else if (spillQueue.length > 0) {
      url = spillQueue.shift(); fromSpill = true;
      console.log(`  [fill] switching to spill queue (${spillQueue.length + 1} deferred URLs)`);
    } else {
      break; // Nothing left to crawl
    }

    const remaining = MAX_PAGES - pages.length;

    // Apply type caps only on primary-queue URLs when there's plenty of room left.
    // Spill-queue URLs bypass caps entirely – they're fill pages.
    if (!fromSpill && siteType && slots && remaining > 3) {
      const urlType = detectTypeFromUrl(url);
      const limit = slots[urlType] ?? 0;

      if (limit === 0) {
        // Hard-excluded type (e.g. service pages for e-shops) → defer to spill
        spillQueue.push(url); continue;
      }
      if (typeCounts[urlType] >= limit) {
        // Over cap – defer only if we still expect to find better pages
        const unfilledSlots = Object.entries(slots).reduce((sum, [t, cap]) =>
          sum + Math.max(0, cap - (typeCounts[t] || 0)), 0);
        if (unfilledSlots > 0) { spillQueue.push(url); continue; }
        // No preferred slots left → let it through
      }
    }

    console.log(`  Crawling [${fromSpill ? 'fill' : 'prio'}]: ${url}`);
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

    typeCounts[pageType] = (typeCounts[pageType] || 0) + 1;
    pages.push(result.data);

    // ── Mid-crawl site type re-evaluation ──────────────────────────────────
    // Initial detection only sees the homepage. These checks use richer evidence:
    // 1) After homepage: scan ALL discovered link URLs for e-shop URL patterns
    // 2) Ongoing: if actual product/category pages found → definitely an e-shop
    let reEvaluated = false;
    if (pages.length === 1 && siteType === 'website') {
      const eshopPatternLinks = result.links.filter(l =>
        /\/(produkt|product|zbozi|item|p\/|katalog|kategori|category|collection|vypis|obchod)/i.test(l)
      ).length;
      if (eshopPatternLinks >= 4) {
        siteType = 'eshop'; slots = SLOTS[siteType]; reEvaluated = true;
        console.log(`  Site type re-evaluated → eshop (${eshopPatternLinks} e-shop URL patterns in homepage links)`);
      }
    }
    if (!reEvaluated && siteType === 'website' &&
        ((typeCounts.product || 0) >= 1 || (typeCounts.category || 0) >= 1)) {
      siteType = 'eshop'; slots = SLOTS[siteType]; reEvaluated = true;
      console.log(`  Site type re-evaluated → eshop (found product/category page types after ${pages.length} pages)`);
    }
    if (reEvaluated) {
      primaryQueue.sort((a, b) => urlPriorityForType(b, siteType) - urlPriorityForType(a, siteType));
      spillQueue.sort((a, b) => urlPriorityForType(b, siteType) - urlPriorityForType(a, siteType));
    }

    // Add newly discovered links to the primary queue (sorted by priority)
    const newLinks = result.links
      .filter(l => !visited.has(l))
      .sort((a, b) => urlPriorityForType(b, siteType) - urlPriorityForType(a, siteType));

    for (const link of newLinks.slice(0, 25)) {
      visited.add(link);
      primaryQueue.push(link);
    }

    // Periodically re-sort the primary queue for accurate priority
    if (pages.length % 3 === 0 && siteType) {
      primaryQueue.sort((a, b) => urlPriorityForType(b, siteType) - urlPriorityForType(a, siteType));
    }

    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`✅ Crawled ${pages.length} pages | type: ${siteType} | distribution: ${JSON.stringify(typeCounts)}`);
  return { pages, siteType: siteType || 'website' };
}

module.exports = { crawlWebsite, normalizeUrl };
