const express = require('express');
const router = express.Router();
const { crawlWebsite, normalizeUrl } = require('../services/crawler');
const { analyzePageRules, checkDuplicates, calculatePageScore } = require('../services/analyzer');
const { analyzeSiteWide } = require('../services/aiAnalyzer');
const { auditIndexability } = require('../services/indexability');
const { savePatterns, getPatterns, buildPatterns } = require('../services/patternStore');

/**
 * POST /api/audit
 * Body: { url: string }
 * Returns: full audit results (pages + scores)
 */
router.post('/', async (req, res) => {
  const { url, hintCategory, hintProduct, hintBlog } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL je povinná' });
  }

  let normalizedUrl;
  try {
    normalizedUrl = normalizeUrl(url.trim());
    new URL(normalizedUrl);
  } catch {
    return res.status(400).json({ error: 'Neplatná URL adresa' });
  }

  if (/localhost|127\.0\.0|192\.168|10\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])/.test(normalizedUrl)) {
    return res.status(400).json({ error: 'Interní adresy nejsou povoleny' });
  }

  try {
    console.log(`\n🔍 Starting audit for: ${normalizedUrl}`);
    const startTime = Date.now();

    // 1. Build hint patterns (user-provided example URLs → regex patterns)
    const hints = { category: hintCategory, product: hintProduct, blog: hintBlog };
    const hasHints = hintCategory || hintProduct || hintBlog;

    // Load stored patterns for this domain (from previous audits)
    const storedPatterns = getPatterns(normalizedUrl);

    // Build from user hints (overrides stored if provided)
    const builtPatterns = hasHints ? buildPatterns(hints) : null;
    const hintPatterns = builtPatterns || storedPatterns;

    if (hasHints) {
      // Save for future automatic detection
      savePatterns(normalizedUrl, hints);
    }

    if (hintPatterns) {
      console.log(`  Using URL patterns:`, hintPatterns);
    }

    // 2. Crawl website (returns pages + siteType)
    const hintUrls = [hintCategory, hintProduct, hintBlog].filter(Boolean);
    const { pages, siteType } = await crawlWebsite(normalizedUrl, hintPatterns, hintUrls);

    if (pages.length === 0) {
      return res.status(422).json({ error: 'Web se nepodařilo načíst. Zkontrolujte URL nebo zkuste znovu.' });
    }

    // 2. Rule-based analysis for each page
    const analyzedPages = pages.map(page => ({
      ...page,
      checks: analyzePageRules(page)
    }));

    // 3. Duplicate content detection (kept for internal use / PDF)
    const { duplicateTitles, duplicateDescriptions } = checkDuplicates(pages);

    // 4. Site-wide AI analysis + indexability run concurrently.
    //    Only ONE AI call (site-wide) — fits comfortably under Railway's 60 s limit.
    //    Timing: crawl ≤ 20 s + max(siteWide ~5 s, indexability ~3 s) = ~25 s total.
    const t_ai_start = Date.now();
    const [siteWide, indexability] = await Promise.all([
      analyzeSiteWide(pages, siteType).then(r => { console.log(`  [timing] siteWide AI done in ${((Date.now()-t_ai_start)/1000).toFixed(1)}s`); return r; }),
      auditIndexability(pages, normalizedUrl),
    ]);

    // 6. Calculate scores (pure rule-based, no per-page AI)
    const pageScores = analyzedPages.map(page => {
      const score = calculatePageScore(page.checks);
      const pageIndexability = indexability.pages.find(p => p.url === page.url) || null;
      return { ...page, score, indexability: pageIndexability };
    });

    const overallScore = Math.round(
      pageScores.reduce((sum, p) => sum + p.score, 0) / pageScores.length
    );

    // 7. Category scores
    const categoryScores = {
      'Title & Meta': avgScore(pageScores, p => (p.checks.title.score + p.checks.metaDescription.score) / 2),
      'Nadpisy & Struktura': avgScore(pageScores, p => p.checks.headings.score),
      'Kvalita obsahu': avgScore(pageScores, p => p.checks.thinContent.score),
      'Obrázky': avgScore(pageScores, p => p.checks.images.score),
      'Technické SEO': avgScore(pageScores, p => (p.checks.structuredData.score + p.checks.openGraph.score + p.checks.url.score) / 3)
    };

    // 8. Collect top issues (site-wide, from all pages)
    const allIssues = [];
    for (const page of pageScores) {
      for (const check of Object.values(page.checks)) {
        allIssues.push(...(check.issues || []));
      }
    }
    const uniqueIssues = [...new Set(allIssues)].slice(0, 5);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const aiElapsed = ((Date.now() - t_ai_start) / 1000).toFixed(1);
    console.log(`✅ Audit completed in ${elapsed}s | Score: ${overallScore}/100 | Pages: ${pages.length} | Type: ${siteType} | AI total: ${aiElapsed}s`);

    const result = {
      url: normalizedUrl,
      siteType,
      overallScore,
      categoryScores,
      pagesAnalyzed: pages.length,
      // Indexability summary (replaces broken links / duplicates in overview)
      indexability: {
        robotsTxtExists: indexability.robotsTxtExists,
        robotsTxtUrl: indexability.robotsTxtUrl,
        indexableCount: indexability.indexableCount,
        totalPages: indexability.totalPages,
        searchIndexation: indexability.searchIndexation
      },
      topIssues: uniqueIssues,
      topStrengths: siteWide.topStrengths || [],
      topRecommendations: siteWide.topRecommendations || [],
      overallSummary: siteWide.overallSummary || '',
      siteWideIssues: siteWide.siteWideIssues || [],
      keywordCannibalization: siteWide.keywordCannibalization || [],
      // Duplicates kept in response for reference but removed from overview display
      duplicateTitles,
      duplicateDescriptions,
      pages: pageScores.map(p => ({
        url: p.url,
        type: p.type,
        title: p.title,
        score: p.score,
        checks: p.checks,
        wordCount: p.wordCount,
        indexability: p.indexability
      })),
      analysedAt: new Date().toISOString(),
      durationSeconds: parseFloat(elapsed),
      _timing: { crawlS: parseFloat((t_ai_start - startTime) / 1000), aiTotalS: parseFloat(aiElapsed) }
    };

    res.json(result);

  } catch (err) {
    console.error('Audit error:', err);
    res.status(500).json({ error: 'Audit selhal. Zkuste to prosím znovu.' });
  }
});

function avgScore(pages, scoreFn) {
  const scores = pages.map(scoreFn).filter(s => typeof s === 'number' && !isNaN(s));
  if (!scores.length) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

module.exports = router;
