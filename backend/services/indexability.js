const axios = require('axios');

const TIMEOUT = 3000; // was 7000 — slow external requests to Google/Seznam were the
                      // main bottleneck (sequential 7s timeouts × 3 requests = 21s worst-
                      // case, sometimes 40+ s with redirect chains from Railway's US servers)
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
 * Parse a number from Czech/English search result counts.
 * Handles non-breaking spaces (\u00A0), regular spaces, commas, dots.
 */
function parseCzechNumber(str) {
  if (!str) return null;
  const cleaned = str.replace(/[\u00A0\s,.]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? null : n;
}

/**
 * Try to estimate indexed pages via site: search operator.
 * Returns { seznam: number|null|'blocked', google: number|null|'blocked' }
 * Best-effort – gracefully degrades if blocked.
 */
async function checkSearchIndexation(domain) {
  const results = { seznam: null, google: null };

  // ── Seznam.cz ─────────────────────────────────────────────────────────────
  try {
    const resp = await axios.get(
      `https://search.seznam.cz/?q=site:${domain}`,
      {
        timeout: TIMEOUT,
        headers: { ...SEARCH_HEADERS, 'Referer': 'https://seznam.cz/' },
        validateStatus: s => s < 500,
        maxRedirects: 3
      }
    );

    if (resp.status === 200) {
      const text = String(resp.data);
      console.log(`  Seznam response: ${resp.status}, length: ${text.length}`);

      // Try multiple patterns – result count appears in various formats
      const patterns = [
        /nalezeno\s+(?:přibližně\s+)?([\d\u00A0\s]+)\s*výsledk/i,
        /([\d][\d\u00A0\s]{0,12})\s*(?:výsledků|výsledek|výsledky)/i,
        /počet výsledků[:\s]+([\d\u00A0\s]+)/i,
        /"totalResults"\s*:\s*"?(\d+)"?/i,
        /"numberOfResults"\s*:\s*(\d+)/i,
      ];

      let found = false;
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          const n = parseCzechNumber(match[1]);
          if (n !== null) { results.seznam = n; found = true; break; }
        }
      }

      if (!found) {
        if (/žádné výsledky|nic nenalezeno|nebyl nalezen|žádný výsledek|no results/i.test(text)) {
          results.seznam = 0;
        } else {
          // Log snippet for debugging
          const snippet = text.slice(0, 800).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
          console.log(`  Seznam: no count matched. Snippet: ${snippet.slice(0, 300)}`);
        }
      }
    }
  } catch (err) {
    console.log(`Seznam check failed: ${err.message}`);
  }

  // ── Google ────────────────────────────────────────────────────────────────
  try {
    const resp = await axios.get(
      `https://www.google.com/search?q=site:${domain}&num=10&hl=cs&gl=cz`,
      {
        timeout: TIMEOUT,
        headers: { ...SEARCH_HEADERS, 'Referer': 'https://www.google.cz/' },
        validateStatus: s => s < 500,
        maxRedirects: 2
      }
    );

    if (resp.status === 200) {
      const text = String(resp.data);
      console.log(`  Google response: ${resp.status}, length: ${text.length}`);

      if (/captcha|sorry\/index|unusual traffic|detected unusual|g-recaptcha/i.test(text)) {
        results.google = 'blocked';
        console.log('  Google: blocked by anti-bot protection');
      } else {
        const patterns = [
          /About ([\d,]+) results/i,
          /Přibližně ([\d\u00A0\s]+) výsledků/i,
          /"([\d,]+)" results/i,
          /result-stats[^>]*>[^<]*([\d\u00A0\s,]+)\s*výsledků/i,
        ];
        let found = false;
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) {
            const n = parseCzechNumber(match[1]);
            if (n !== null) { results.google = n; found = true; break; }
          }
        }
        if (!found) {
          if (/did not match|neodpovídá žádným/i.test(text)) {
            results.google = 0;
          } else {
            console.log('  Google: no result count found');
          }
        }
      }
    } else if (resp.status === 429 || resp.status === 503) {
      results.google = 'blocked';
    }
  } catch (err) {
    console.log(`Google check failed: ${err.message}`);
  }

  console.log(`  Search indexation: seznam=${results.seznam}, google=${results.google}`);
  return results;
}

/**
 * Full indexability audit for a set of crawled pages
 */
async function auditIndexability(pages, baseUrl) {
  const robotsTxt = await fetchRobotsTxt(baseUrl);

  const pageResults = pages.map(page => checkPageIndexability(page, robotsTxt));
  const indexableCount = pageResults.filter(p => p.indexable).length;

  // checkSearchIndexation (site: queries to Google/Seznam) dropped from UI –
  // was the main cause of Railway 60 s proxy timeouts (sequential 7 s external
  // requests × redirect chains from US servers = 40+ s).

  return {
    robotsTxtExists: robotsTxt !== null,
    robotsTxtUrl: `${new URL(baseUrl).origin}/robots.txt`,
    pages: pageResults,
    indexableCount,
    totalPages: pages.length,
    searchIndexation: null
  };
}

module.exports = { auditIndexability, fetchRobotsTxt, checkPageIndexability, checkSearchIndexation };
