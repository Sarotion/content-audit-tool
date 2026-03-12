const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const CRAWL_TIMEOUT = 4000;   // per-page fetch timeout (ms) — was 8000
const MAX_PAGES = 20;         // was 15 — extra pages allow deeper crawl (3-level eshops)
const CRAWL_DELAY_MS = 100;   // delay between pages (ms) — was 300
// Wall-clock budget for the entire crawl phase. Stops crawling once this threshold
// is reached so AI analysis can start well before Railway's 60 s proxy timeout.
// Budget = 30 s leaves ~30 s for AI phase (Haiku page analysis ≈ 10–15 s with
// 2 s 429-retry, site-wide Haiku ≈ 3–5 s — both run concurrently via Promise.all).
const CRAWL_WALL_BUDGET_MS = 30000;

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
/**
 * Check if a URL matches a user-provided hint pattern.
 * hintPatterns: { category?, product?, blog? } – regex strings from patternStore.
 * Returns the matched type string or null.
 */
function detectTypeFromHint(url, hintPatterns) {
  if (!hintPatterns) return null;
  const u = url.toLowerCase();
  try {
    if (hintPatterns.product  && new RegExp(hintPatterns.product).test(u))  return 'product';
    if (hintPatterns.category && new RegExp(hintPatterns.category).test(u)) return 'category';
    if (hintPatterns.blog     && new RegExp(hintPatterns.blog).test(u))     return 'blog';
  } catch (err) {
    console.error('[crawler] Invalid hint pattern:', err.message);
  }
  return null;
}

function detectTypeFromUrl(url) {
  const u = url.toLowerCase();
  try {
    const urlObj = new URL(u);
    if (urlObj.pathname === '/' || urlObj.pathname === '') return 'homepage';
  } catch {}
  // Shoptet: _z{id} = product, _k{id} = category (very common Czech e-shop platform)
  if (/_z\d+(\/|$)/.test(u)) return 'product';
  if (/_k\d+(\/|$)/.test(u)) return 'category';
  // Standard patterns (WooCommerce, Shopify, custom)
  if (/\/(produkt|product|zbozi|item|products?\/)/.test(u)) return 'product';
  if (/\/(kategori|category|vypis|collection|collections?\/)/.test(u)) return 'category';
  if (/\/product-category\//.test(u)) return 'category';
  if (/\/(blog|clanek|clanky|prispevk|article|novinky|aktualit)/.test(u)) return 'blog';
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

  // ── Platform body-class detection (fast path, very reliable) ────────────
  // Shoptet (and some other Czech e-shop platforms) set type-* tokens on <body>.
  // This is the most reliable signal for plain-slug URL structures.
  const bodyClass = $('body').attr('class') || '';
  if (/\btype-product\b|\btype-detail\b/.test(bodyClass)) return 'product';
  if (/\btype-category\b|\btype-list\b/.test(bodyClass)) return 'category';
  if (/\btype-index\b|\btype-home\b/.test(bodyClass)) return 'homepage';
  if (/\btype-article\b|\btype-blog\b/.test(bodyClass)) return 'blog';

  // ── URL-based detection (fast path) ──────────────────────────────────────
  // Shoptet: _z{id} = product, _k{id} = category
  if (/_z\d+(\/|$)/.test(u)) return 'product';
  if (/_k\d+(\/|$)/.test(u)) return 'category';
  // Standard patterns
  if (/\/(produkt|product|zbozi|item|products?\/)/.test(u)) return 'product';
  if (/\/(kategori|category|vypis|collection|collections?\/)/.test(u)) return 'category';
  if (/\/product-category\//.test(u)) return 'category';
  if (/\/(blog|clanek|clanky|prispevk|article|novinky|aktualit)/.test(u)) return 'blog';
  if (/\/(o-nas|o-firme|about|o-spolecnosti|kdo-jsme)/.test(u)) return 'about';
  if (/\/(kontakt|contact)/.test(u)) return 'contact';
  if (/\/(sluzby|services|nabidka|reseni|cenik|pricing)/.test(u)) return 'service';

  // ── Content-based detection (scoring) ────────────────────────────────────
  // Accumulate signals for 'product' and 'category'; highest score wins.
  let productScore = 0;
  let categoryScore = 0;

  // ── Product signals ──────────────────────────────────────────────────────

  // Schema.org Product markup (very reliable)
  if ($('[itemtype*="schema.org/Product"]').length > 0) productScore += 5;

  // Quantity input (almost exclusive to product detail pages)
  if ($('input[type="number"][name*="qty"], input[name*="quantity"], input[name*="pocet"], ' +
        'input[name*="mnozstvi"], [class*="qty-input"], [class*="quantity-input"], ' +
        'input[id*="quantity"], [class*="amount-input"]').length > 0) productScore += 5;

  // Count add-to-cart buttons:
  //   exactly 1 → detail page;  ≥2 → listing (quick-add per product)
  const cartBtnCount = $(
    '[class*="add-to-cart"], [class*="do-kosiku"], [class*="pridat-do-kosiku"], ' +
    '[class*="pd-buy"], [class*="product-detail-buy"], [class*="buy-btn"], [id*="buy-btn"], ' +
    '.single_add_to_cart_button, [data-action*="cart"], ' +
    'form[action*="kosik"] button[type="submit"], form[action*="cart"] button[type="submit"]'
  ).length;
  if (cartBtnCount === 1) productScore += 4;
  else if (cartBtnCount >= 2) { categoryScore += 3; }  // multiple quick-adds = listing

  // Availability / stock indicator (common on product detail)
  if ($('[itemprop="availability"], [class*="availability"], [class*="dostupnost"], ' +
        '[class*="skladem"], [class*="in-stock"], [class*="out-of-stock"]').length > 0) productScore += 2;

  // Product image gallery (single-product view)
  if ($('[class*="product-gallery"], [class*="product-images"], [class*="product-photo"], ' +
        '[class*="product-img"], [id*="product-gallery"], [class*="hlavni-obrazek"]').length > 0) productScore += 2;

  // Variant / option selectors (size, color, etc.)
  if ($('select[name*="variant"], select[name*="varianta"], select[name*="option"], ' +
        '[class*="product-variant"], [class*="product-option"], [class*="variant-select"], ' +
        '[class*="barva-select"], [class*="velikost-select"]').length > 0) productScore += 3;

  // Single prominent price (not a list — product detail has 1 price)
  const priceCount = $('[itemprop="price"], [class*="product-price"]:not([class*="list"]), ' +
                       '[class*="pd-price"], [class*="detail-price"]').length;
  if (priceCount === 1) productScore += 2;

  // ── Category / listing signals ────────────────────────────────────────────

  // Pagination (very strong signal — product detail pages never paginate)
  const hasPagination = (
    $('[class*="pagination"], .pager, [class*="strankovani"], [class*="paginator"], ' +
      '[class*="page-nav"], nav[aria-label*="stránk"], [class*="pages-list"]').length > 0 ||
    $('a[href*="page="], a[href*="stranka="], a[href*="pg="], a[href*="p="]').length >= 2
  );
  if (hasPagination) categoryScore += 5;

  // Sort control (listings almost always have one)
  // Shoptet uses div.listSorting (matched by [class*="sorting"] and [class*="listSorting"])
  if ($('select[name*="sort"], select[name*="razeni"], select[name*="order"], ' +
        '[class*="sort-select"], [class*="sorting"], [class*="order-by"], ' +
        '[class*="product-sort"], [class*="listSorting"], [data-sort]').length > 0) categoryScore += 4;

  // Filter / facet sidebar
  if ($('[class*="filter"], [class*="filtr"], [class*="filtrace"], ' +
        '[class*="facet"], aside [class*="category"]').length > 0) categoryScore += 3;

  // Count of product tiles/cards on the page (key signal)
  // Shoptet uses div.products > div.product (bare class, no suffix)
  const tileCount = $(
    '[class*="product-item"], [class*="product-card"], [class*="item-product"], ' +
    '[data-product-id], [class*="product-tile"], [class*="category-product"], ' +
    'ul.products li, ul.product-list li, .products-grid > *, [class*="produkty"] > li, ' +
    '.products.products-page .product, .products-block .product, ' +
    '[class*="products-"] > .product'
  ).length;
  if (tileCount >= 8) categoryScore += 6;
  else if (tileCount >= 4) categoryScore += 4;
  else if (tileCount >= 2) categoryScore += 2;

  // Multiple prices on the page (each product in a listing has its own price)
  const multiPrice = $('[class*="price"], [class*="cena"], [itemprop="price"]').length;
  if (multiPrice >= 6) categoryScore += 4;
  else if (multiPrice >= 3) categoryScore += 2;

  // Product count text ("X produktů", "Nalezeno X", "X výsledků")
  const bodyTextSample = $('body').text().slice(0, 5000);
  if (/\b\d+\s*(produktů|položek|výsledků|nalezených|zboží)\b/i.test(bodyTextSample)) categoryScore += 3;

  // ── Decision ─────────────────────────────────────────────────────────────
  const urlPath = (() => { try { return new URL(url).pathname; } catch { return url; } })();
  console.log(`  [type-detect] ${urlPath} → product:${productScore} category:${categoryScore} tiles:${tileCount} cart:${cartBtnCount} prices:${multiPrice}`);
  if (productScore >= 4 || categoryScore >= 4) {
    if (productScore > categoryScore) return 'product';
    if (categoryScore > productScore) return 'category';
    if (productScore > 0) return 'product'; // tie → lean product
  }

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
    /\/(produkt|product|zbozi|item|kategori|category|collection|vypis|obchod|shop\/|product-category\/)/i.test(l.href) ||
    /_[kz]\d+(\/|$)/.test(l.href)  // Shoptet: _k{id} category, _z{id} product
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
  // For e-shops: allow up to 8 "other" URL-type pages so plain-slug sites (Shoptet without
  // _k/_z suffixes, etc.) can be crawled. DOM detection re-classifies them correctly.
  eshop: { homepage: 1, product: 5, category: 4, blog: 2, about: 1, contact: 1, service: 0, other: 8 },
  website: { homepage: 1, service: 4, blog: 2, about: 1, contact: 1, product: 0, category: 0, other: 2 }
};

/**
 * URL priority score for queue ordering (higher = crawled sooner).
 * E-shop order: products → categories → fromCategory links → blog → about/contact → other
 *
 * @param {string}  url
 * @param {string}  siteType        - 'eshop' | 'website'
 * @param {object}  hintPatterns    - { category?, product?, blog? } regex strings
 * @param {Set}     [fromCategoryUrls] - links discovered on a DOM-detected category page
 */
function urlPriorityForType(url, siteType, hintPatterns, fromCategoryUrls = null, navLinksFromHomepage = null) {
  // Hint patterns take highest precedence
  const hintType = detectTypeFromHint(url, hintPatterns);
  if (hintType === 'product')  return 10;
  if (hintType === 'category') return 9;
  if (hintType === 'blog')     return 6;

  // Links found on an already-crawled category page → likely products or sub-categories
  if (siteType === 'eshop' && fromCategoryUrls && fromCategoryUrls.has(url)) return 8;

  // Nav/header links from homepage on an e-shop are very likely product categories.
  // Priority 7 ensures they're crawled before unknown plain-slug pages (priority 1),
  // so their outbound product links can populate fromCategoryUrls early.
  if (siteType === 'eshop' && navLinksFromHomepage && navLinksFromHomepage.has(url)) return 7;

  const u = url.toLowerCase();
  if (siteType === 'eshop') {
    // Shoptet: _z{id} = product, _k{id} = category
    if (/_z\d+(\/|$)/.test(u)) return 10;
    if (/_k\d+(\/|$)/.test(u)) return 9;
    // Standard patterns
    if (/\/(produkt|product|zbozi|item|products?\/)/.test(u)) return 10;
    if (/\/(kategori|category|vypis|collection|collections?\/)/.test(u)) return 9;
    if (/\/product-category\//.test(u)) return 9;
    if (/\/(blog|clanek|clanky|prispevk|article|novinky|aktualit)/.test(u)) return 5;
    if (/\/(o-nas|o-firme|about|kontakt|contact)/.test(u)) return 3;
    return 1;
  } else {
    if (/\/(sluzby|services|nabidka|reseni|cenik|pricing)/.test(u)) return 10;
    if (/\/(o-nas|o-firme|about)/.test(u)) return 7;
    if (/\/(kontakt|contact)/.test(u)) return 6;
    if (/\/(blog|clanek|article|novinky|aktualit)/.test(u)) return 4;
    return 1;
  }
}

// ─── Data extraction ──────────────────────────────────────────────────────────

function extractInternalLinks($, baseUrl, pageUrl) {
  const origin = new URL(baseUrl).origin;
  const base = baseUrl.replace(/\/$/, ''); // Normalize for comparison
  const links = new Set();
  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      // Normalize: strip trailing slash so https://domain.com/ and https://domain.com are identical
      const full = new URL(href, pageUrl).href.split('#')[0].split('?')[0].replace(/\/$/, '');
      if (full.startsWith(origin) && full !== base) links.add(full);
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

  // ⚠️ Extract structured data, internal links AND JS data layer BEFORE removing nav/scripts,
  // otherwise nav links, LD+JSON and pageType hints would be lost ($.remove() mutates in place).
  const structuredData = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const d = JSON.parse($(el).html());
      structuredData.push(d['@type'] || (Array.isArray(d) ? d.map(x => x['@type']) : 'Unknown'));
    } catch {}
  });

  // ── JS data layer: platform-embedded page type (highest reliability) ─────
  // Shoptet, Upgates and similar platforms embed {"pageType":"category"} /
  // {"pageType":"productDetail"} / {"pageType":"article"} in inline scripts.
  // Extract BEFORE script removal so we have the definitive type signal.
  let jsPageType = null;
  $('script:not([src])').each((_, el) => {
    if (jsPageType) return; // stop after first match
    const src = $(el).html() || '';
    const m = src.match(/"pageType"\s*:\s*"([^"]+)"/i);
    if (m) jsPageType = m[1].toLowerCase();
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

  // Map JS data layer pageType → our internal type strings
  // Falls back to DOM/URL scoring when not available.
  const jsType = jsPageType
    ? (() => {
        const pt = jsPageType;
        if (pt === 'productdetail' || pt === 'product') return 'product';
        if (pt === 'category' || pt === 'categorylist') return 'category';
        if (pt === 'article' || pt === 'blog') return 'blog';
        if (pt === 'index' || pt === 'homepage' || pt === 'home') return 'homepage';
        return null; // unknown value → fall through
      })()
    : null;

  return {
    url,
    type: jsType || detectPageType(url, $),
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

async function crawlWebsite(startUrl, hintPatterns = null, hintUrls = []) {
  const base = normalizeUrl(startUrl).replace(/\/$/, ''); // Always strip trailing slash
  const visited = new Set([base]);

  // Two-tier queue:
  //   primaryQueue – preferred pages (respects type caps; crawled first)
  //   spillQueue   – pages deferred by caps (crawled as fill when primary is empty)
  // This guarantees we always reach MAX_PAGES even when an e-shop uses
  // non-standard URL slugs that don't match our product/category patterns.
  const primaryQueue = [base];
  const spillQueue = [];
  const pages = [];

  // URLs discovered from category pages — likely products/sub-categories.
  // We boost their URL-detected type to 'product' so they bypass the
  // other→spill redirect and get crawled directly from the primary queue.
  const fromCategoryUrls = new Set();

  // Nav/header links extracted from the homepage.
  // On e-shops, main navigation almost always points to product categories.
  // Priority 7 ensures they're crawled before anonymous plain-slug pages (priority 1),
  // so their product links can populate fromCategoryUrls early in the crawl.
  const navLinksFromHomepage = new Set();

  // Pre-seed queue with hint URLs (known valid pages of specific types).
  // Crawling them early ensures their outbound links (e.g. products on a category page)
  // fill the discovery queue and we reach MAX_PAGES.
  for (const hintUrl of hintUrls) {
    if (!hintUrl) continue;
    const normalized = hintUrl.trim().replace(/\/$/, '');
    if (normalized && !visited.has(normalized)) {
      visited.add(normalized);
      primaryQueue.push(normalized);
    }
  }

  let siteType = null;
  let slots = null;
  const typeCounts = { homepage: 0, product: 0, category: 0, blog: 0, about: 0, contact: 0, service: 0, other: 0 };
  const crawlStart = Date.now();

  console.log(`🕷️  Starting crawl: ${base}`);

  while (pages.length < MAX_PAGES) {
    // Respect wall-clock crawl budget so AI analysis can start before Railway's
    // proxy timeout closes the connection. Always crawl at least the 1st page.
    if (pages.length > 0 && (Date.now() - crawlStart) >= CRAWL_WALL_BUDGET_MS) {
      console.log(`  [budget] Crawl wall-clock budget reached after ${pages.length} pages — stopping crawl early`);
      break;
    }

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

    // ── Type cap enforcement ──────────────────────────────────────────────────
    if (siteType && slots && remaining > 3) {
      let urlType = detectTypeFromHint(url, hintPatterns) || detectTypeFromUrl(url);

      // URLs discovered from a DOM-detected category page are very likely products.
      // Treat them as 'product' type so they bypass the other→spill redirect and
      // get crawled from primary queue (enables plain-slug Shoptet sites to work).
      if (urlType === 'other' && fromCategoryUrls.has(url) && siteType === 'eshop') {
        urlType = 'product';
      }

      const limit = slots[urlType] ?? 0;

      if (!fromSpill) {
        // PRIMARY queue: enforce all caps strictly
        if (limit === 0) {
          // Excluded type (e.g. "service" for e-shops, etc.) → defer to spill as fill
          spillQueue.push(url); continue;
        }
        if (typeCounts[urlType] >= limit) {
          // Over cap – skip entirely. Do NOT add to spill (would bypass caps there).
          // Only let through if all preferred slots are already filled.
          const unfilledSlots = Object.entries(slots).reduce((sum, [t, cap]) =>
            sum + Math.max(0, cap - (typeCounts[t] || 0)), 0);
          if (unfilledSlots > 0) continue; // Better pages expected – skip this one
          // All preferred slots filled → accept as extra fill
        }
      } else {
        // SPILL queue (fill mode): still respect soft caps for typed pages.
        // Only bypass cap for limit===0 types (those are the intentional fill pages).
        if (limit > 0 && typeCounts[urlType] >= limit) {
          continue; // Cap exceeded even in fill mode – skip
        }
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

      // For e-shops: extract nav/header links from homepage — on Shoptet and similar
      // platforms the main navigation almost exclusively contains product category links.
      // These get priority 7 so they're crawled before plain-slug unknowns (priority 1),
      // ensuring fromCategoryUrls is populated early and products are discovered quickly.
      if (siteType === 'eshop') {
        const origin = new URL(base).origin;
        result.$('nav a[href], header a[href], [class*="navigation"] a[href], [class*="nav-bar"] a[href], .main-menu a[href], #main-menu a[href]').each((_, el) => {
          try {
            const href = result.$(el).attr('href');
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
            const full = new URL(href, url).href.split('#')[0].split('?')[0].replace(/\/$/, '');
            if (full.startsWith(origin) && full !== base) navLinksFromHomepage.add(full);
          } catch {}
        });
        console.log(`  Nav links from homepage: ${navLinksFromHomepage.size}`);
      }
    }

    typeCounts[pageType] = (typeCounts[pageType] || 0) + 1;
    pages.push(result.data);

    // Mark links discovered from category pages as likely products.
    // These will be prioritised over generic 'other' pages during cap enforcement.
    if (pageType === 'category') {
      for (const link of result.links) {
        fromCategoryUrls.add(link);
      }
    }

    // ── Mid-crawl site type re-evaluation ──────────────────────────────────
    // Initial detection only sees the homepage. These checks use richer evidence:
    // 1) After homepage: scan ALL discovered link URLs for e-shop URL patterns
    // 2) Ongoing: if actual product/category pages found → definitely an e-shop
    let reEvaluated = false;
    if (pages.length === 1 && siteType === 'website') {
      const eshopPatternLinks = result.links.filter(l =>
        /\/(produkt|product|zbozi|item|p\/|katalog|kategori|category|collection|vypis|obchod)/i.test(l) ||
        detectTypeFromHint(l, hintPatterns) === 'product' ||
        detectTypeFromHint(l, hintPatterns) === 'category'
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
      primaryQueue.sort((a, b) => urlPriorityForType(b, siteType, hintPatterns, fromCategoryUrls, navLinksFromHomepage) - urlPriorityForType(a, siteType, hintPatterns, fromCategoryUrls, navLinksFromHomepage));
      spillQueue.sort((a, b) => urlPriorityForType(b, siteType, hintPatterns, fromCategoryUrls, navLinksFromHomepage) - urlPriorityForType(a, siteType, hintPatterns, fromCategoryUrls, navLinksFromHomepage));
    }

    // Add newly discovered links and ALWAYS re-sort the entire primary queue.
    // Without a full sort, newly-added high-priority fromCategoryUrls items (priority 8)
    // would sit at the back of the queue behind already-queued lower-priority pages.
    const newLinks = result.links
      .filter(l => !visited.has(l));

    for (const link of newLinks.slice(0, 80)) {
      visited.add(link);
      primaryQueue.push(link);
    }

    // Full sort after every page crawled – ensures fromCategoryUrls items (prio 8)
    // and navLinksFromHomepage items (prio 7) float above plain pages (prio 1).
    if (siteType) {
      primaryQueue.sort((a, b) => urlPriorityForType(b, siteType, hintPatterns, fromCategoryUrls, navLinksFromHomepage) - urlPriorityForType(a, siteType, hintPatterns, fromCategoryUrls, navLinksFromHomepage));
    }

    if (CRAWL_DELAY_MS > 0) await new Promise(r => setTimeout(r, CRAWL_DELAY_MS));
  }

  console.log(`✅ Crawled ${pages.length} pages | type: ${siteType} | distribution: ${JSON.stringify(typeCounts)}`);
  return { pages, siteType: siteType || 'website' };
}

module.exports = { crawlWebsite, normalizeUrl };
