const express = require('express');
const router = express.Router();
const { crawlWebsite, normalizeUrl } = require('../services/crawler');
const { analyzePageRules, checkDuplicates, calculatePageScore } = require('../services/analyzer');
const { analyzePageWithAI, analyzeSiteWide } = require('../services/aiAnalyzer');

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
    new URL(normalizedUrl); // validate
  } catch {
    return res.status(400).json({ error: 'Neplatná URL adresa' });
  }

  // Block localhost/private IPs
  if (/localhost|127\.0\.0|192\.168|10\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])/.test(normalizedUrl)) {
    return res.status(400).json({ error: 'Interní adresy nejsou povoleny' });
  }

  try {
    console.log(`\n🔍 Starting audit for: ${normalizedUrl}`);
    const startTime = Date.now();

    // 1. Crawl website
    const { pages, brokenLinks } = await crawlWebsite(normalizedUrl);

    if (pages.length === 0) {
      return res.status(422).json({ error: 'Web se nepodařilo načíst. Zkontrolujte URL nebo zkuste znovu.' });
    }

    // 2. Rule-based analysis for each page
    const analyzedPages = pages.map(page => ({
      ...page,
      checks: analyzePageRules(page)
    }));

    // 3. Duplicate content detection across all pages
    const { duplicateTitles, duplicateDescriptions } = checkDuplicates(pages);

    // 4. AI analysis – limit to 5 most important pages to control costs
    const priorityPages = [
      analyzedPages.find(p => p.type === 'homepage') || analyzedPages[0],
      ...analyzedPages.filter(p => p.type === 'product').slice(0, 2),
      ...analyzedPages.filter(p => p.type === 'category').slice(0, 2)
    ].filter(Boolean).filter((p, i, arr) => arr.findIndex(x => x.url === p.url) === i);

    const aiResults = await Promise.all(
      priorityPages.map(page => analyzePageWithAI(page))
    );

    // Attach AI results to pages
    priorityPages.forEach((page, i) => {
      const idx = analyzedPages.findIndex(p => p.url === page.url);
      if (idx >= 0) analyzedPages[idx].aiAnalysis = aiResults[i];
    });

    // 5. Site-wide AI analysis
    const siteWide = await analyzeSiteWide(pages);

    // 6. Calculate scores
    const pageScores = analyzedPages.map(page => {
      const ruleScore = calculatePageScore(page.checks);
      const aiScore = page.aiAnalysis
        ? Math.round((
            page.aiAnalysis.firstImpression.score +
            page.aiAnalysis.benefitGap.score +
            page.aiAnalysis.emotionalTone.score +
            page.aiAnalysis.contentQuality.score
          ) / 4)
        : null;

      const finalScore = aiScore !== null
        ? Math.round(ruleScore * 0.65 + aiScore * 0.35)
        : ruleScore;

      return { ...page, ruleScore, aiScore, finalScore };
    });

    const overallScore = Math.round(
      pageScores.reduce((sum, p) => sum + p.finalScore, 0) / pageScores.length
    );

    // 7. Category scores
    const categoryScores = {
      'Title & Meta': avgScore(pageScores, p => (p.checks.title.score + p.checks.metaDescription.score) / 2),
      'Nadpisy & Struktura': avgScore(pageScores, p => p.checks.headings.score),
      'Kvalita obsahu': avgScore(pageScores, p => {
        const ai = p.aiAnalysis?.contentQuality?.score || p.checks.thinContent.score;
        return (p.checks.thinContent.score + ai) / 2;
      }),
      'Obrázky': avgScore(pageScores, p => p.checks.images.score),
      'Technické SEO': avgScore(pageScores, p => (p.checks.structuredData.score + p.checks.openGraph.score + p.checks.url.score) / 3),
      'Copy & Přínos': avgScore(pageScores, p => {
        const ai = p.aiAnalysis;
        return ai ? (ai.benefitGap.score + ai.emotionalTone.score + ai.firstImpression.score) / 3 : 50;
      })
    };

    // 8. Collect top issues
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

    // Deduplicate and take top 5
    const uniqueIssues = [...new Set(allIssues)].slice(0, 5);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Audit completed in ${elapsed}s | Score: ${overallScore}/100 | Pages: ${pages.length}`);

    const result = {
      url: normalizedUrl,
      overallScore,
      categoryScores,
      pagesAnalyzed: pages.length,
      brokenLinksCount: brokenLinks.length,
      brokenLinks: brokenLinks.slice(0, 10),
      duplicateTitles,
      duplicateDescriptions,
      topIssues: uniqueIssues,
      topStrengths: siteWide.topStrengths || [],
      topRecommendations: siteWide.topRecommendations || [],
      overallSummary: siteWide.overallSummary || '',
      siteWideIssues: siteWide.siteWideIssues || [],
      keywordCannibalization: siteWide.keywordCannibalization || [],
      pages: pageScores.map(p => ({
        url: p.url,
        type: p.type,
        title: p.title,
        score: p.finalScore,
        checks: p.checks,
        aiAnalysis: p.aiAnalysis || null,
        wordCount: p.wordCount
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
