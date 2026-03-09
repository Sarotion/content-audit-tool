const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * AI analysis for a single page using Claude
 * Covers: benefit gap, emotional tone, first impression, generic content, content quality
 */
async function analyzePageWithAI(page) {
  const prompt = `Analyzuješ stránku e-shopu pro content audit. Odpovídej POUZE v JSON formátu.

URL: ${page.url}
Typ stránky: ${page.type}
Title: ${page.title || '(chybí)'}
H1: ${page.h1.join(' | ') || '(chybí)'}
H2 nadpisy: ${page.h2.slice(0, 5).join(' | ') || '(žádné)'}
Obsah stránky (prvních 1500 znaků): ${page.bodyText.slice(0, 1500)}

Vrať JSON s přesně touto strukturou:
{
  "firstImpression": {
    "score": 0-100,
    "headline": "Krátký titulek hodnocení (max 10 slov)",
    "summary": "Co návštěvník pochopí jako PRVNÍ zprávu stránky (1-2 věty)",
    "issues": ["konkrétní problém 1", "konkrétní problém 2"],
    "passed": ["co funguje 1"]
  },
  "benefitGap": {
    "score": 0-100,
    "headline": "Krátký titulek",
    "summary": "Popis: odpovídá copy na otázku PROČ koupit/navštívit? (1-2 věty)",
    "issues": ["konkrétní chybějící benefit 1"],
    "passed": ["benefit který text obsahuje"]
  },
  "emotionalTone": {
    "score": 0-100,
    "tone": "technický|prodejní|důvěryhodný|neutrální|inspirativní",
    "headline": "Krátký titulek",
    "summary": "Jak text působí na čtenáře (1-2 věty)",
    "issues": [],
    "passed": []
  },
  "contentQuality": {
    "score": 0-100,
    "isGeneric": true/false,
    "headline": "Krátký titulek",
    "summary": "Celkové hodnocení kvality obsahu (1-2 věty)",
    "issues": ["konkrétní problém"],
    "passed": ["co je dobré"]
  }
}

Buď konkrétní a akční. Vyhni se obecnostem. Skóre 0-100 kde 100 = perfektní.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('AI analysis failed:', err.message);
    return getDefaultAIResults();
  }
}

/**
 * Analyze cross-page issues (keyword cannibalization, site-wide generic content)
 */
async function analyzeSiteWide(pages) {
  const pagesSummary = pages.slice(0, 8).map(p => ({
    url: p.url,
    type: p.type,
    title: p.title,
    h1: p.h1[0] || '',
    wordCount: p.wordCount,
    firstSentence: p.bodyText.slice(0, 150)
  }));

  const prompt = `Analyzuješ více stránek e-shopu. Odpovídej POUZE v JSON formátu.

Stránky:
${JSON.stringify(pagesSummary, null, 2)}

Vrať JSON:
{
  "siteWideIssues": ["problém 1", "problém 2"],
  "keywordCannibalization": [
    {"keyword": "klíčové slovo", "urls": ["url1", "url2"]}
  ],
  "topStrengths": ["silná stránka webu 1", "silná stránka 2"],
  "topRecommendations": [
    {"priority": "vysoká|střední|nízká", "action": "konkrétní doporučení", "impact": "očekávaný dopad"}
  ],
  "overallSummary": "2-3 věty o celkovém stavu obsahu webu"
}

Maximálně 3 položky v každém poli. Buď konkrétní.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    });

    const text = response.content[0].text;
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Site-wide AI analysis failed:', err.message);
    return {
      siteWideIssues: [],
      keywordCannibalization: [],
      topStrengths: [],
      topRecommendations: [],
      overallSummary: 'Analýza nebyla dokončena.'
    };
  }
}

function getDefaultAIResults() {
  return {
    firstImpression: { score: 50, headline: 'Analýza nedostupná', summary: '', issues: [], passed: [] },
    benefitGap: { score: 50, headline: 'Analýza nedostupná', summary: '', issues: [], passed: [] },
    emotionalTone: { score: 50, tone: 'neutrální', headline: 'Analýza nedostupná', summary: '', issues: [], passed: [] },
    contentQuality: { score: 50, isGeneric: false, headline: 'Analýza nedostupná', summary: '', issues: [], passed: [] }
  };
}

module.exports = { analyzePageWithAI, analyzeSiteWide };
