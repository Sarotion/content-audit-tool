const axios = require('axios');

const TIMEOUT = 7000;
const SEARCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml',
  'Accept-Language': 'cs-CZ,cs;q=0.9,en;q=0.8'
};

/**
 * Fetch robots.txt for the given base URL
 */
async function fetchRobotsTxt(baseUrl) {
  try {
    const origin = new URL(baseUrl).origin;
    const resp = await axios.get(`${origin}/robots.txt`, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ContentAuditBot/1.0)' },
      validateStatus: s => s < 500
    });
    if (resp.status === 200 && typeof resp.data === 'string') {
      return resp.data.slice(0, 8000);
    }
  } catch {}
  return null;
}

/**
 * Simple robots.txt parser – checks if a URL is disallowed for any user-agent
 */
function isBlockedByRobots(robotsTxt, url) {
  if (!robotsTxt) return false;
  try {
    const path = new URL(url).pathname;
    let inGlobalBlock = false;
    const disallowed = [];

    for (const rawLine of robotsTxt.split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = line.slice(colonIdx + 1).trim();

      if (key === 'user-agent') {
        inGlobalBlock = (val === '*');
      } else if (key === 'disallow' && inGlobalBlock && val) {
        disallowed.push(val);
      }
    }

    return disallowed.some(rule => path.startsWith(rule));
  } catch {
    return false;
  }
}

/**
 * Check a single page's technical indexability
 */
function checkPageIndexability(page, robotsTxt) {
  const issues = [];
  let indexable = true;

  // meta robots noindex
  if (page.robots) {
    if (/noindex/i.test(page.robots)) {
      issues.push({ type: 'noindex', detail: 'Stránka má meta robots: noindex – vyhledávače ji nezaindexují' });
      indexable = false;
    }
    if (/nofollow/i.test(page.robots)) {
      issues.push({ type: 'nofollow', detail: 'Meta robots: nofollow – vyhledávače nesledují odchozí odkazy' });
    }
  }

  // X-Robots-Tag header
  if (page.xRobotsTag) {
    if (/noindex/i.test(page.xRobotsTag)) {
      issues.push({ type: 'noindex_header', detail: 'HTTP hlavička X-Robots-Tag: noindex blokuje indexaci' });
      indexable = false;
    }
  }

  // Canonical pointing elsewhere
  if (page.canonical) {
    const canonNorm = page.canonical.replace(/\/$/, '').split('?')[0];
    const urlNorm = page.url.replace(/\/$/, '').split('?')[0];
    if (canonNorm && canonNorm !== urlNorm) {
      issues.push({ type: 'canonical', detail: `Canonical ukazuje na jinou URL: ${page.canonical.slice(0, 80)}` });
      // canonical redirect doesn't block indexation of THIS page necessarily, but worth noting
    }
  }

  // robots.txt
  if (robotsTxt && isBlockedByRobots(robotsTxt, page.url)) {
    issues.push({ type: 'robots_txt', detail: 'URL je blokována souborem robots.txt' });
    indexable = false;
  }

  return { url: page.url, indexable, issues };
}

/**
 * Try to estimate how many pages are indexed via site: search operator.
 * Returns { seznam: number|null|'blocked', google: number|null|'blocked' }
 * Best-effort – gracefully degrades if blocked.
 */
async function checkSearchIndexation(domain) {
  const results = { seznam: null, google: null };

  // Seznam.cz
  try {
    const resp = await axios.get(
      `https://search.seznam.cz/?q=site%3A${encodeURIComponent(domain)}`,
      { timeout: TIMEOUT, headers: SEARCH_HEADERS, validateStatus: s => s < 500 }
    );
    if (resp.status === 200) {
      const text = String(resp.data);
      // Pattern: "Nalezeno 1 234 výsledků" or "1 výsledek" etc.
      const match = text.match(/([\d\s]+)\s*(výsledků|výsledek|výsledky)/i);
      if (match) {
        results.seznam = parseInt(match[1].replace(/\s/g, ''), 10);
      } else if (/žádné výsledky|nic nenalezeno|nebyl nalezen/i.test(text)) {
        results.seznam = 0;
      }
    }
  } catch (err) {
    console.log('Seznam indexation check failed:', err.message);
  }

  // Google
  try {
    const resp = await axios.get(
      `https://www.google.com/search?q=site%3A${encodeURIComponent(domain)}&num=10&hl=cs`,
      { timeout: TIMEOUT, headers: SEARCH_HEADERS, validateStatus: s => s < 500 }
    );
    if (resp.status === 200) {
      const text = String(resp.data);
      if (/captcha|sorry\/index|unusual traffic|detected unusual/i.test(text)) {
        results.google = 'blocked';
      } else {
        const match = text.match(/About ([\d,]+) results/i)
          || text.match(/Přibližně ([\d\s]+) výsledků/i)
          || text.match(/([\d\s,]+)\s*výsledků/i);
        if (match) {
          results.google = parseInt(match[1].replace(/[,\s]/g, ''), 10);
        } else if (/did not match|neodpovídá|no results/i.test(text)) {
          results.google = 0;
        }
      }
    }
  } catch (err) {
    console.log('Google indexation check failed:', err.message);
  }

  return results;
}

/**
 * Full indexability audit for a set of crawled pages
 */
async function auditIndexability(pages, baseUrl) {
  const robotsTxt = await fetchRobotsTxt(baseUrl);

  const pageResults = pages.map(page => checkPageIndexability(page, robotsTxt));
  const indexableCount = pageResults.filter(p => p.indexable).length;

  let domain;
  try { domain = new URL(baseUrl).hostname; } catch { domain = baseUrl; }

  const searchIndexation = await checkSearchIndexation(domain);

  return {
    robotsTxtExists: robotsTxt !== null,
    robotsTxtUrl: `${new URL(baseUrl).origin}/robots.txt`,
    pages: pageResults,
    indexableCount,
    totalPages: pages.length,
    searchIndexation
  };
}

module.exports = { auditIndexability, fetchRobotsTxt, checkPageIndexability, checkSearchIndexation };
