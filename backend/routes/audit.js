const express = require('express');
const router = express.Router();
const { crawlWebsite, normalizeUrl } = require('../services/crawler');
const { analyzePageRules, checkDuplicates, calculatePageScore } = require('../services/analyzer');
const { analyzePageWithAI, analyzeSiteWide } = require('../services/aiAnalyzer');
const { auditIndexability } = require('../services/indexability');

/**
 * POST /api/audit
 * Body: { url: string }
 * Returns: full audit results (pages + scores)
 */
router.post('/', async (req, res) => {
  const { url } = req.body;

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

    // 1. Crawl website (returns pages + siteType)
    const { pages, siteType } = await crawlWebsite(normalizedUrl);

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

    // 4. AI analysis – batched (3 at a time) to avoid Anthropic concurrent connection limit
    const aiResults = [];
    const AI_BATCH = 3;
    for (let i = 0; i < analyzedPages.length; i += AI_BATCH) {
      const batch = analyzedPages.slice(i, i + AI_BATCH);
      const batchResults = await Promise.all(batch.map(page => analyzePageWithAI(page, siteType)));
      aiResults.push(...batchResults);
    }

    // Attach AI results to pages
    analyzedPages.forEach((page, i) => {
      analyzedPages[i].aiAnalysis = aiResults[i];
    });

    // 5. Site-wide AI analysis (Sonnet for quality)
    const siteWide = await analyzeSiteWide(pages, siteType);

    // 6. Indexability audit (robots.txt + meta robots + canonical + search engines)
    const indexability = await auditIndexability(pages, normalizedUrl);

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
    console.log(`✅ Audit completed in ${elapsed}s | Score: ${overallScore}/100 | Pages: ${pages.length} | Type: ${siteType}`);

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
      durationSeconds: parseFloat(elapsed)
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
