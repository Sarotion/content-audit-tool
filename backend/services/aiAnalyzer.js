const Anthropic = require('@anthropic-ai/sdk');

const apiKey = process.env.ANTHROPIC_API_KEY;
console.log(`[aiAnalyzer] ANTHROPIC_API_KEY: ${apiKey ? `set (starts with ${apiKey.slice(0, 10)}...)` : 'NOT SET ⚠️'}`);
const client = new Anthropic({ apiKey });

/**
 * AI analysis for a single page using Claude
 * Covers: benefit gap, emotional tone, first impression, generic content, content quality
 */
async function analyzePageWithAI(page, siteType = 'eshop') {
  const siteContext = siteType === 'eshop'
    ? 'e-shopem (online obchod)'
    : 'firemním webem (služby/prezentace)';

  const prompt = `Analyzuješ konkrétní stránku webu pro content audit. Odpovídej POUZE v JSON formátu.

URL: ${page.url}
Typ stránky: ${page.type}
Typ webu: ${siteContext}
Title: ${page.title || '(chybí)'}
H1: ${page.h1.join(' | ') || '(chybí)'}
H2 nadpisy: ${page.h2.slice(0, 5).join(' | ') || '(žádné)'}
Počet slov: ${page.wordCount}
Obsah stránky (prvních 1500 znaků): ${page.bodyText.slice(0, 1500)}

PRAVIDLA PRO FORMULACI:
- Každý problém (issue) = konkrétní dopad na zákazníky nebo tržby, NE technický popis.
  Špatně: "Chybí meta description"
  Správně: "Zákazníci ve vyhledávači nevidí důvod proč kliknout na váš web – přicházíte o návštěvníky"
- quickWin = konkrétní instrukce pro junior marketéra: co přesně napsat, kam to dát, jaký text použít
- Formát quickWin: "Na stránce [URL/sekce]: [přesná instrukce s konkrétním textem nebo příkladem]"

Vrať JSON s přesně touto strukturou:
{
  "firstImpression": {
    "score": 0-100,
    "headline": "Krátký titulek hodnocení (max 8 slov)",
    "summary": "Co zákazník pochopí jako první zprávu stránky (1-2 věty, přátelsky)",
    "issues": ["dopad na zákazníky/tržby – konkrétně"],
    "passed": ["co funguje a proč to pomáhá"],
    "quickWin": "Konkrétní instrukce co přesně udělat, kde a s jakým textem"
  },
  "benefitGap": {
    "score": 0-100,
    "headline": "Krátký titulek",
    "summary": "Odpovídá text na otázku PROČ tady nakoupit/objednat? (1-2 věty)",
    "issues": ["proč zákazníci nekonvertují – konkrétně"],
    "passed": ["benefit který text dobře komunikuje"],
    "quickWin": "Jaký benefit přidat, kam na stránce a s jakým přesným textem"
  },
  "emotionalTone": {
    "score": 0-100,
    "tone": "technický|prodejní|důvěryhodný|neutrální|inspirativní|přátelský",
    "headline": "Krátký titulek",
    "summary": "Jak text působí na zákazníka (1-2 věty)",
    "issues": ["co v tónu textu odpuzuje zákazníky"],
    "passed": ["co v tónu funguje"],
    "quickWin": "Konkrétně: jaká slova nahradit čím a v které části textu"
  },
  "contentQuality": {
    "score": 0-100,
    "isGeneric": true,
    "headline": "Krátký titulek",
    "summary": "Celkové hodnocení kvality obsahu (1-2 věty)",
    "issues": ["proč tento obsah nepomáhá tržbám"],
    "passed": ["co je v obsahu silné"],
    "quickWin": "Co přepsat, jak dlouhý text, jaký konkrétní obsah přidat"
  }
}

Skóre 0-100 kde 100 = perfektní. Buď konkrétní a akční.`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = response.content[0].text;
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('AI page analysis failed:', err.message, err.status, err.error);
    return getDefaultAIResults();
  }
}

/**
 * Site-wide AI analysis – holistic view across all crawled pages.
 * Designed for a non-technical e-shop or website owner.
 */
async function analyzeSiteWide(pages, siteType = 'eshop') {
  const siteContext = siteType === 'eshop' ? 'e-shopu' : 'firemního webu';
  const ownerContext = siteType === 'eshop'
    ? 'majitel e-shopu (zajímají ho tržby, konverze, zákazníci)'
    : 'majitel firmy (zajímají ho leady, poptávky, důvěryhodnost)';

  const pagesSummary = pages.slice(0, 10).map(p => ({
    url: p.url,
    type: p.type,
    title: p.title,
    h1: p.h1[0] || '',
    wordCount: p.wordCount,
    firstSentence: p.bodyText.slice(0, 200)
  }));

  const prompt = `Jsi přátelský SEO a content konzultant. Analyzuješ vzorek ${pages.length} stránek ${siteContext}. Výsledek uvidí ${ownerContext} – piš jako přátelský expert, ne jako robot.

Analyzované stránky:
${JSON.stringify(pagesSummary, null, 2)}

PRAVIDLA:
- Žádný technický žargon bez vysvětlení
- Mluvit o VZORCÍCH přes celý web, ne o jedné konkrétní stránce
- Každý problém = co to stojí zákazníky nebo peníze
- Každá silná stránka = co funguje a proč to pomáhá byznysu
- overallSummary: osobní, konkrétní, 3-4 věty. Zmiň co web dělá dobře a co je největší příležitost ke zlepšení. Použij konkrétní čísla (počet stránek, skóre, apod.) pokud pomáhají.
- topStrengths: vzorce které se opakují na více stránkách jako silná stránka webu
- siteWideIssues: problémy které jsou vidět across stránkách, ne jen na jedné
- topRecommendations: max 3, seřazené od největšího dopadu, velmi konkrétní

Vrať JSON:
{
  "siteWideIssues": ["problém viditelný přes celý web – dopad na zákazníky/tržby", "..."],
  "keywordCannibalization": [
    {"keyword": "klíčové slovo", "urls": ["url1", "url2"]}
  ],
  "topStrengths": ["silná stránka webu – proč to pomáhá byznysu", "..."],
  "topRecommendations": [
    {
      "priority": "vysoká|střední|nízká",
      "action": "Konkrétní akce – co přesně udělat (ne jen 'zlepšit obsah')",
      "impactDescription": "Co se změní pro zákazníky nebo tržby po provedení",
      "ease": 1,
      "impact": 3
    }
  ],
  "overallSummary": "3-4 věty v přátelském tónu pro majitele. Konkrétní, ne obecné. Zmiň co je největší příležitost."
}

Pro topRecommendations:
- ease: 1=snadné (hodina práce), 2=střední (den práce), 3=složité (týden+)
- impact: 1=malý dopad, 2=střední dopad, 3=velký dopad na konverze/návštěvnost

Maximálně 3 položky v každém poli. Buď konkrétní a přátelský.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1400,
      messages: [{ role: 'user', content: prompt }]
    });
    const text = response.content[0].text;
    const clean = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Site-wide AI analysis failed:', err.message, err.status, err.error);
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
