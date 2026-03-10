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

KLÍČOVÉ PRAVIDLO pro issues: Každý problém formuluj jako dopad na byznys – NE technicky.
Špatně: "Chybí meta description"
Správně: "Zákazníci ve vyhledávači nevidí důvod proč kliknout na váš web místo konkurence – přicházíte o návštěvníky."
Formát každého issue: [co je špatně] – [co to znamená pro tržby nebo zákazníky].

KLÍČOVÉ PRAVIDLO pro quickWin: Musí být tak konkrétní, aby ji zvládl junior marketér bez zkušeností.
Uveď přesný text, přesné místo (URL, sekce), přesný postup. Příklad:
"Na stránce /nazev-produktu změňte titulek z aktuálního na: Název produktu – hlavní benefit | Název eshopu. Udělejte to v CMS pod záložkou SEO → Meta title."

Vrať JSON s přesně touto strukturou:
{
  "firstImpression": {
    "score": 0-100,
    "headline": "Krátký titulek hodnocení (max 10 slov)",
    "summary": "Co návštěvník pochopí jako PRVNÍ zprávu stránky (1-2 věty)",
    "issues": ["dopad na byznys 1 – co to znamená pro zákazníky", "dopad na byznys 2"],
    "passed": ["co funguje 1"],
    "quickWin": "Konkrétní instrukce: co přesně udělat, kde, s jakým textem/hodnotou"
  },
  "benefitGap": {
    "score": 0-100,
    "headline": "Krátký titulek",
    "summary": "Popis: odpovídá copy na otázku PROČ koupit/navštívit? (1-2 věty)",
    "issues": ["dopad chybějícího benefitu – proč zákazníci nekoupí"],
    "passed": ["benefit který text obsahuje"],
    "quickWin": "Konkrétní instrukce: jaký benefit přidat, kam na stránce a s jakým přesným textem"
  },
  "emotionalTone": {
    "score": 0-100,
    "tone": "technický|prodejní|důvěryhodný|neutrální|inspirativní",
    "headline": "Krátký titulek",
    "summary": "Jak text působí na čtenáře (1-2 věty)",
    "issues": [],
    "passed": [],
    "quickWin": "Konkrétní instrukce: jak upravit tón – jaká slova nahradit čím, v které části textu"
  },
  "contentQuality": {
    "score": 0-100,
    "isGeneric": true/false,
    "headline": "Krátký titulek",
    "summary": "Celkové hodnocení kvality obsahu (1-2 věty)",
    "issues": ["dopad na byznys – proč generický text škodí tržbám"],
    "passed": ["co je dobré"],
    "quickWin": "Konkrétní instrukce: co přepsat, jak dlouhý má být text, jaký konkrétní obsah přidat"
  }
}

Skóre 0-100 kde 100 = perfektní. Buď konkrétní a akční. Vyhni se obecnostem.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
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
    {
      "priority": "vysoká|střední|nízká",
      "action": "konkrétní doporučení – co přesně udělat",
      "impactDescription": "očekávaný dopad na tržby nebo návštěvnost (text)",
      "ease": 1,
      "impact": 3
    }
  ],
  "overallSummary": "2-3 věty o celkovém stavu obsahu webu"
}

Pro topRecommendations – přiřaď každému doporučení:
- ease: odhad náročnosti provedení: 1=snadné (hodina práce), 2=střední (den práce), 3=složité (týden+)
- impact: očekávaný dopad: 1=malý dopad na konverze/návštěvnost, 2=střední dopad, 3=velký dopad

Maximálně 3 položky v každém poli. Buď konkrétní.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
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
    firstImpression: { score: 50, headline: 'Analýza nedostupná', summary: '', issues: [], passed: [], quickWin: '' },
    benefitGap: { score: 50, headline: 'Analýza nedostupná', summary: '', issues: [], passed: [], quickWin: '' },
    emotionalTone: { score: 50, tone: 'neutrální', headline: 'Analýza nedostupná', summary: '', issues: [], passed: [], quickWin: '' },
    contentQuality: { score: 50, isGeneric: false, headline: 'Analýza nedostupná', summary: '', issues: [], passed: [], quickWin: '' }
  };
}

module.exports = { analyzePageWithAI, analyzeSiteWide };
