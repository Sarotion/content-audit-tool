const axios = require('axios');
const cheerio = require('cheerio');

const CRAWL_TIMEOUT = 8000;
const MAX_PAGES = 10;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; ContentAuditBot/1.0; +https://contentaudit.tool)',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'cs,en;q=0.9'
};

/**
 * Normalise URL – ensure it has a scheme and no trailing slash
 */
function normalizeUrl(url) {
  if (!url.startsWith('http')) url = 'https://' + url;
  return url.replace(/\/$/, '');
}

/**
 * Extract all internal links from a page
 */
function extractInternalLinks($, baseUrl, pageUrl) {
  const origin = new URL(baseUrl).origin;
  const links = new Set();

  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      const full = new URL(href, pageUrl).href.split('#')[0].split('?')[0];
      if (full.startsWith(origin) && full !== baseUrl) {
        links.add(full);
      }
    } catch {}
  });

  return [...links];
}

/**
 * Detect page type from URL and content
 */
function detectPageType(url, $) {
  const u = url.toLowerCase();
  const breadcrumb = $('[itemtype*="BreadcrumbList"], .breadcrumb, nav[aria-label*="bread"]').text().toLowerCase();

  if (u.includes('/produkt') || u.includes('/product') || u.includes('/zbozi') || u.includes('/item') || $('[itemtype*="Product"]').length > 0) return 'product';
  if (u.includes('/kategori') || u.includes('/category') || u.includes('/vypis') || u.includes('/collection')) return 'category';
  if (u.includes('/blog') || u.includes('/clanek') || u.includes('/article')) return 'blog';
  if (u === normalizeUrl(u.split('/').slice(0, 3).join('/')) || u.endsWith('/') && u.split('/').length <= 4) return 'homepage';
  return 'other';
}

/**
 * Extract all relevant SEO data from a page
 */
function extractPageData(url, html, $) {
  // Basic meta
  const title = $('title').first().text().trim();
  const metaDescription = $('meta[name="description"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || '';
  const robots = $('meta[name="robots"]').attr('content') || '';

  // OpenGraph
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogDescription = $('meta[property="og:description"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';

  // Headings
  const h1 = $('h1').map((_, el) => $(el).text().trim()).get();
  const h2 = $('h2').map((_, el) => $(el).text().trim()).get();
  const h3 = $('h3').map((_, el) => $(el).text().trim()).get();

  // Body text (clean)
  $('script, style, nav, footer, header, .cookie, #cookie, [class*="cookie"], [class*="popup"]').remove();
  const bodyText = $('main, article, .product-description, .category-description, #content, body')
    .first().text().replace(/\s+/g, ' ').trim().slice(0, 3000);

  // Images
  const images = $('img').map((_, el) => ({
    src: $(el).attr('src') || '',
    alt: $(el).attr('alt') || null
  })).get().slice(0, 30);

  // Structured data
  const structuredData = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const d = JSON.parse($(el).html());
      structuredData.push(d['@type'] || (Array.isArray(d) ? d.map(x => x['@type']) : 'Unknown'));
    } catch {}
  });

  // Internal links on this page
  const internalLinks = $('a[href]').map((_, el) => ({
    href: $(el).attr('href') || '',
    text: $(el).text().trim().slice(0, 50)
  })).get().filter(l => l.href && !l.href.startsWith('#') && !l.href.startsWith('mailto:')).slice(0, 50);

  // Word count
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  return {
    url,
    type: detectPageType(url, $),
    title,
    metaDescription,
    canonical,
    robots,
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

/**
 * Fetch and parse a single URL
 */
async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      timeout: CRAWL_TIMEOUT,
      headers: HEADERS,
      maxRedirects: 5,
      validateStatus: s => s < 500
    });

    if (!response.headers['content-type']?.includes('html')) return null;

    const $ = cheerio.load(response.data);
    return {
      data: extractPageData(url, response.data, $),
      links: extractInternalLinks($, url, url),
      statusCode: response.status
    };
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err.message);
    return null;
  }
}

/**
 * Score URL by priority (prefer product/category pages)
 */
function urlPriority(url) {
  const u = url.toLowerCase();
  if (u.includes('/produkt') || u.includes('/product') || u.includes('/zbozi')) return 3;
  if (u.includes('/kategori') || u.includes('/category') || u.includes('/vypis')) return 2;
  return 1;
}

/**
 * Main crawl function
 * Returns array of page data objects
 */
async function crawlWebsite(startUrl) {
  const base = normalizeUrl(startUrl);
  const visited = new Set([base]);
  const queue = [base];
  const pages = [];

  // Check for broken internal links separately
  const brokenLinks = [];

  console.log(`🕷️  Starting crawl: ${base}`);

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift();
    console.log(`  Crawling: ${url}`);

    const result = await fetchPage(url);

    if (!result) {
      if (url !== base) brokenLinks.push(url);
      continue;
    }

    if (result.statusCode === 404) {
      brokenLinks.push(url);
      continue;
    }

    pages.push(result.data);

    // Add new links to queue, prioritised
    const newLinks = result.links
      .filter(l => !visited.has(l))
      .sort((a, b) => urlPriority(b) - urlPriority(a));

    for (const link of newLinks.slice(0, 20)) {
      visited.add(link);
      queue.push(link);
    }

    // Small delay to be polite
    await new Promise(r => setTimeout(r, 300));
  }

  // Check a sample of remaining discovered links for 404s
  const uncrawledSample = [...visited].filter(u => !pages.find(p => p.url === u)).slice(0, 20);
  for (const url of uncrawledSample) {
    try {
      const resp = await axios.head(url, { timeout: 4000, headers: HEADERS, maxRedirects: 3, validateStatus: () => true });
      if (resp.status === 404) brokenLinks.push(url);
    } catch {}
  }

  console.log(`✅ Crawled ${pages.length} pages, found ${brokenLinks.length} broken links`);

  return { pages, brokenLinks };
}

module.exports = { crawlWebsite, normalizeUrl };
