const express = require('express');
const router = express.Router();
const { crawlWebsite, normalizeUrl } = require('../services/crawler');
const { analyzePageRules, checkDuplicates, calculatePageScore } = require('../services/analyzer');
const { analyzePageWithAI, analyzeSiteWide } = require('../services/aiAnalyzer');
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

    // 4. Run page AI analysis, site-wide AI and indexability CONCURRENTLY.
    //
    // AI is expensive time-wise: claude-haiku-4-5 can trigger 429 rate limits when
    // called concurrently. To stay under Railway's 60 s proxy timeout we:
    //   a) Only analyse the top MAX_AI_PAGES most-important pages with AI
    //      (homepage → product → category → service → about → blog → other)
    //   b) Use batch size 2 (less concurrent load, fewer 429s)
    //   c) Remaining pages receive rule-based scores only (aiAnalysis = null)
    //
    // Timing budget: crawl ≤ 30 s + page AI ≤ 16 s (3 batches × ~5 s) + margin ≤ 56 s.

    const MAX_AI_PAGES = 6;
    const AI_TYPE_PRIORITY = ['homepage', 'product', 'category', 'service', 'about', 'contact', 'blog', 'other'];

    // Select the most important pages for AI (sorted by type priority, then original order)
    const aiPageSet = new Set(
      [...analyzedPages]
        .sort((a, b) => {
          const ai = AI_TYPE_PRIORITY.indexOf(a.type);
          const bi = AI_TYPE_PRIORITY.indexOf(b.type);
          return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        })
        .slice(0, MAX_AI_PAGES)
        .map(p => p.url)
    );

    const t_ai_start = Date.now();
    async function runPageAi(pages, siteType) {
      const AI_BATCH = 2; // batch 2 to reduce concurrent 429 pressure
      const aiResultMap = {};
      const pagesForAI = pages.filter(p => aiPageSet.has(p.url));
      for (let i = 0; i < pagesForAI.length; i += AI_BATCH) {
        if (i > 0) await new Promise(r => setTimeout(r, 200));
        const batch = pagesForAI.slice(i, i + AI_BATCH);
        const batchResults = await Promise.all(batch.map(p => analyzePageWithAI(p, siteType)));
        batch.forEach((p, j) => { aiResultMap[p.url] = batchResults[j]; });
      }
      // Return results in original page order; non-analysed pages get null
      return pages.map(p => aiResultMap[p.url] || null);
    }

    const t_sitewide_start = Date.now();
    const [aiResults, siteWide, indexability] = await Promise.all([
      runPageAi(analyzedPages, siteType).then(r => { console.log(`  [timing] pageAI done in ${((Date.now()-t_ai_start)/1000).toFixed(1)}s (${MAX_AI_PAGES} pages)`); return r; }),
      analyzeSiteWide(pages, siteType).then(r => { console.log(`  [timing] siteWide done in ${((Date.now()-t_sitewide_start)/1000).toFixed(1)}s`); return r; }),
      auditIndexability(pages, normalizedUrl),
    ]);

    // Attach AI results to pages (null = page was not AI-analysed)
    analyzedPages.forEach((page, i) => {
      analyzedPages[i].aiAnalysis = aiResults[i];
    });

    // 7. Calculate scores
    const pageScores = analyzedPages.map(page => {
      const ruleScore = calculatePageScore(page.checks);
      const ai = page.aiAnalysis;
      const aiScore = ai
        ? Math.round((
            ai.firstImpression.score +
            ai.benefitGap.score +
            ai.emotionalTone.score +
            ai.contentQuality.score
          ) / 4)
        : null;

      const finalScore = aiScore !== null
        ? Math.round(ruleScore * 0.60 + aiScore * 0.40)
        : ruleScore;

      // Merge indexability data into each page
      const pageIndexability = indexability.pages.find(p => p.url === page.url) || null;

      return { ...page, ruleScore, aiScore, finalScore, indexability: pageIndexability };
    });

    const overallScore = Math.round(
      pageScores.reduce((sum, p) => sum + p.finalScore, 0) / pageScores.length
    );

    // 8. Category scores
    const categoryScores = {
      'Title & Meta': avgScore(pageScores, p => (p.checks.title.score + p.checks.metaDescription.score) / 2),
      'Nadpisy & Struktura': avgScore(pageScores, p => p.checks.headings.score),
      'Kvalita obsahu': avgScore(pageScores, p => {
        const ai = p.aiAnalysis?.contentQuality?.score;
        return ai != null ? (p.checks.thinContent.score + ai) / 2 : p.checks.thinContent.score;
      }),
      'Obrázky': avgScore(pageScores, p => p.checks.images.score),
      'Technické SEO': avgScore(pageScores, p => (p.checks.structuredData.score + p.checks.openGraph.score + p.checks.url.score) / 3),
      'Copy & Přínos': avgScore(pageScores, p => {
        const ai = p.aiAnalysis;
        return ai ? (ai.benefitGap.score + ai.emotionalTone.score + ai.firstImpression.score) / 3 : 50;
      })
    };

    // 9. Collect top issues (site-wide, from all pages)
    const allIssues = [];
    for (const page of pageScores) {
      for (const check of Object.values(page.checks)) {
        allIssues.push(...(check.issues || []));
      }
      if (page.aiAnalysis) {
        allIssues.push(...(page.aiAnalysis.contentQuality?.issues || []));
        allIssues.push(...(page.aiAnalysis.benefitGap?.issues || []));
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
        score: p.finalScore,
        ruleScore: p.ruleScore,
        aiScore: p.aiScore,
        checks: p.checks,
        aiAnalysis: p.aiAnalysis || null,
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
