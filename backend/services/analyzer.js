/**
 * Rule-based SEO/content checks
 * Returns { score, issues, passed } per check
 */

// ─── TITLE TAG ───────────────────────────────────────────────────────────────

function checkTitle(page) {
  const issues = [];
  const passed = [];
  let score = 100;

  if (!page.title) {
    return { score: 0, issues: ['Title tag chybí'], passed: [] };
  }

  const len = page.title.length;

  if (len < 10) { score -= 50; issues.push(`Title je příliš krátký (${len} znaků, minimum 30)`); }
  else if (len < 30) { score -= 20; issues.push(`Title je krátký (${len} znaků, doporučení 50–60)`); }
  else if (len > 70) { score -= 20; issues.push(`Title je příliš dlouhý (${len} znaků, max. 60 – Google ho ořízne)`); }
  else if (len >= 50 && len <= 60) { passed.push('Délka title tagu je ideální (50–60 znaků)'); }
  else { passed.push(`Délka title tagu je v pořádku (${len} znaků)`); }

  return { score: Math.max(0, score), issues, passed, value: page.title };
}

// ─── META DESCRIPTION ────────────────────────────────────────────────────────

function checkMetaDescription(page) {
  const issues = [];
  const passed = [];
  let score = 100;

  if (!page.metaDescription) {
    return { score: 0, issues: ['Meta description chybí – Google si vytvoří vlastní snippet, který nemusí konvertovat'], passed: [] };
  }

  const len = page.metaDescription.length;

  if (len < 50) { score -= 40; issues.push(`Meta description je příliš krátký (${len} znaků)`); }
  else if (len > 165) { score -= 25; issues.push(`Meta description je příliš dlouhý (${len} znaků, Google ořízne na ~155)`); }
  else { passed.push(`Délka meta description je v pořádku (${len} znaků)`); }

  const ctaWords = ['koupit', 'objednát', 'zjistit', 'prozkoumat', 'vyberte', 'nakupte', 'zdarma', 'akce', 'sleva', 'doručení'];
  const hasCta = ctaWords.some(w => page.metaDescription.toLowerCase().includes(w));
  if (!hasCta) { score -= 20; issues.push('Meta description neobsahuje žádnou výzvu k akci (CTA)'); }
  else { passed.push('Meta description obsahuje výzvu k akci'); }

  return { score: Math.max(0, score), issues, passed, value: page.metaDescription };
}

// ─── HEADINGS ────────────────────────────────────────────────────────────────

function checkHeadings(page) {
  const issues = [];
  const passed = [];
  let score = 100;

  if (page.h1.length === 0) {
    score -= 50; issues.push('Stránka nemá žádný nadpis H1 – kritická chyba pro SEO');
  } else if (page.h1.length > 1) {
    score -= 30; issues.push(`Stránka má ${page.h1.length}× H1 – měl by být jen jeden`);
  } else {
    passed.push('Stránka má právě jeden H1');
  }

  if (page.h2.length === 0 && page.wordCount > 200) {
    score -= 20; issues.push('Chybí H2 nadpisy – obsah nemá strukturu');
  } else if (page.h2.length > 0) {
    passed.push(`Stránka používá ${page.h2.length} H2 nadpisů`);
  }

  return { score: Math.max(0, score), issues, passed, h1: page.h1, h2: page.h2 };
}

// ─── THIN CONTENT ────────────────────────────────────────────────────────────

function checkThinContent(page) {
  const issues = [];
  const passed = [];
  let score = 100;

  const minWords = page.type === 'product' ? 200 : page.type === 'category' ? 150 : 100;

  if (page.wordCount < 50) {
    score = 5; issues.push(`Extrémně málo obsahu (${page.wordCount} slov) – stránka je prakticky prázdná`);
  } else if (page.wordCount < minWords) {
    score -= 50; issues.push(`Nedostatečné množství obsahu (${page.wordCount} slov, doporučení: min. ${minWords} pro ${page.type} stránku)`);
  } else if (page.wordCount >= 300) {
    passed.push(`Dostatečné množství obsahu (${page.wordCount} slov)`);
  } else {
    passed.push(`Obsah stránky (${page.wordCount} slov) splňuje minimum`);
  }

  return { score: Math.max(0, score), issues, passed, wordCount: page.wordCount };
}

// ─── IMAGES / ALT TEXTS ──────────────────────────────────────────────────────

function checkImages(page) {
  const issues = [];
  const passed = [];
  let score = 100;

  const imgs = page.images.filter(i => i.src && !i.src.includes('data:'));
  if (imgs.length === 0) return { score: 100, issues: [], passed: ['Stránka neobsahuje obrázky'], imagesCount: 0 };

  const missing = imgs.filter(i => i.alt === null || i.alt === '');
  const generic = imgs.filter(i => i.alt && /^(image|img|photo|picture|foto|obrázek)\d*$/i.test(i.alt.trim()));

  const missingPct = missing.length / imgs.length;

  if (missingPct > 0.5) {
    score -= 50; issues.push(`${missing.length} z ${imgs.length} obrázků nemá alt text (${Math.round(missingPct * 100)}%)`);
  } else if (missingPct > 0) {
    score -= 25; issues.push(`${missing.length} obrázků chybí alt text`);
  } else {
    passed.push('Všechny obrázky mají alt text');
  }

  if (generic.length > 0) {
    score -= 15; issues.push(`${generic.length} obrázků má generický alt text (např. "image1")`);
  }

  return { score: Math.max(0, score), issues, passed, imagesCount: imgs.length, missingAlt: missing.length };
}

// ─── STRUCTURED DATA ─────────────────────────────────────────────────────────

function checkStructuredData(page) {
  const issues = [];
  const passed = [];
  let score = 60; // starts lower – structured data is bonus

  const types = page.structuredData.flat().map(t => String(t).toLowerCase());

  if (types.includes('product') || types.includes('itemlist')) {
    score = 100; passed.push('Stránka obsahuje Product schema.org markup');
  } else if (types.includes('breadcrumblist')) {
    score = 80; passed.push('Stránka obsahuje BreadcrumbList schema');
  } else if (types.length > 0) {
    score = 70; passed.push(`Stránka obsahuje schema: ${types.join(', ')}`);
  } else {
    if (page.type === 'product') {
      issues.push('Chybí Product schema.org – přicházíte o rich snippets (hvězdičky, cena ve výsledcích)');
    } else {
      issues.push('Chybí strukturovaná data schema.org');
    }
  }

  return { score, issues, passed, types };
}

// ─── OPEN GRAPH ───────────────────────────────────────────────────────────────

function checkOpenGraph(page) {
  const issues = [];
  const passed = [];
  let score = 100;

  if (!page.ogTitle) { score -= 30; issues.push('Chybí og:title – sdílení na sociálních sítích bude nevzhledné'); }
  else passed.push('og:title je nastaven');

  if (!page.ogDescription) { score -= 25; issues.push('Chybí og:description'); }
  else passed.push('og:description je nastaven');

  if (!page.ogImage) { score -= 45; issues.push('Chybí og:image – bez obrázku Facebook/LinkedIn příspěvky nezaujmou'); }
  else passed.push('og:image je nastaven');

  return { score: Math.max(0, score), issues, passed };
}

// ─── URL STRUCTURE ────────────────────────────────────────────────────────────

function checkUrl(page) {
  const issues = [];
  const passed = [];
  let score = 100;

  const url = page.url;
  const path = url.replace(/^https?:\/\/[^/]+/, '');

  if (path.length > 80) { score -= 20; issues.push(`URL je příliš dlouhá (${path.length} znaků)`); }
  else passed.push('Délka URL je v pořádku');

  if (/[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/.test(url)) { score -= 15; issues.push('URL obsahuje velká písmena'); }
  if (url.includes('?') || url.includes('&')) { score -= 10; issues.push('URL obsahuje parametry – zvažte čisté URL'); }

  const segments = path.split('/').filter(Boolean);
  if (segments.length > 5) { score -= 10; issues.push('URL má příliš mnoho úrovní (doporučení: max. 3–4)'); }

  return { score: Math.max(0, score), issues, passed };
}

// ─── DUPLICATE CONTENT DETECTION ─────────────────────────────────────────────

function checkDuplicates(pages) {
  const duplicateTitles = [];
  const duplicateDescriptions = [];
  const titleMap = {};
  const descMap = {};

  for (const page of pages) {
    if (page.title) {
      if (titleMap[page.title]) {
        duplicateTitles.push({ title: page.title, urls: [titleMap[page.title], page.url] });
      } else {
        titleMap[page.title] = page.url;
      }
    }
    if (page.metaDescription) {
      if (descMap[page.metaDescription]) {
        duplicateDescriptions.push({ desc: page.metaDescription.slice(0, 60) + '...', urls: [descMap[page.metaDescription], page.url] });
      } else {
        descMap[page.metaDescription] = page.url;
      }
    }
  }

  return { duplicateTitles, duplicateDescriptions };
}

// ─── MAIN RULE-BASED ANALYSIS ─────────────────────────────────────────────────

function analyzePageRules(page) {
  return {
    title: checkTitle(page),
    metaDescription: checkMetaDescription(page),
    headings: checkHeadings(page),
    thinContent: checkThinContent(page),
    images: checkImages(page),
    structuredData: checkStructuredData(page),
    openGraph: checkOpenGraph(page),
    url: checkUrl(page)
  };
}

/**
 * Calculate weighted page score from rule checks
 */
function calculatePageScore(checks) {
  const weights = {
    title: 0.15,
    metaDescription: 0.12,
    headings: 0.13,
    thinContent: 0.18,
    images: 0.08,
    structuredData: 0.10,
    openGraph: 0.08,
    url: 0.06
  };

  // Remaining weight (0.10) is for AI checks added later
  let total = 0;
  let totalWeight = 0;

  for (const [key, weight] of Object.entries(weights)) {
    if (checks[key] !== undefined) {
      total += checks[key].score * weight;
      totalWeight += weight;
    }
  }

  return Math.round(total / totalWeight);
}

// ─── RULE-BASED CONTENT ANALYSIS ─────────────────────────────────────────────
// Produces the same JSON shape as the AI per-page analysis so the frontend
// doesn't need any changes.  100 % deterministic, instant, no API calls.

function generateContentAnalysis(page, siteType) {
  const { title, h1, h2, bodyText, wordCount, type, url } = page;
  const text = (bodyText || '').toLowerCase();
  const isEshop = siteType === 'eshop';
  const clamp = v => Math.max(0, Math.min(100, Math.round(v)));

  // ── firstImpression ───────────────────────────────────────────────────────
  let fiScore = 60;
  const fiIssues = [];
  const fiPassed = [];
  let fiQuickWin = '';

  if (title && title.length >= 30) {
    fiScore += 10; fiPassed.push('Title stránky je dostatečně popisný');
  } else if (!title || title.length < 15) {
    fiScore -= 20; fiIssues.push('Návštěvník nevidí jasnou informaci o čem stránka je – riskujete okamžitý odchod');
  }

  if (h1.length === 1 && h1[0].length > 10) {
    fiScore += 15; fiPassed.push('Jasný hlavní nadpis (H1) pomáhá orientaci');
  } else if (h1.length === 0) {
    fiScore -= 20; fiIssues.push('Chybí hlavní nadpis – zákazník neví na co se dívá');
    fiQuickWin = `Na stránce ${url}: Přidejte výstižný H1 nadpis, který jasně říká co stránka nabízí`;
  }

  if (wordCount >= 100) {
    fiScore += 10; fiPassed.push('Stránka má dostatek úvodního textu');
  } else if (wordCount < 50) {
    fiScore -= 15; fiIssues.push('Prakticky žádný obsah – zákazník nemá důvod zůstat');
    if (!fiQuickWin) fiQuickWin = `Na stránce ${url}: Přidejte minimálně 150 slov popisujících co nabízíte a proč`;
  }

  if (!fiQuickWin && fiIssues.length > 0)
    fiQuickWin = `Na stránce ${url}: Zlepšete nadpis a úvodní text tak, aby zákazník do 3 sekund věděl co nabízíte`;

  const fiHeadline = fiScore >= 70 ? 'Dobrý první dojem' : fiScore >= 45 ? 'První dojem potřebuje práci' : 'Slabý první dojem';
  const fiSummary = fiScore >= 70
    ? 'Stránka komunikuje svůj účel jasně, návštěvník se rychle zorientuje.'
    : fiScore >= 45
      ? 'Stránka by mohla lépe komunikovat svůj hlavní účel a přitáhnout pozornost.'
      : 'Návštěvník pravděpodobně nepozná hned, co mu stránka nabízí a proč by měl zůstat.';

  // ── benefitGap ────────────────────────────────────────────────────────────
  let bgScore = 60;
  const bgIssues = [];
  const bgPassed = [];
  let bgQuickWin = '';

  const ctaKw = ['koupit', 'objednat', 'přidat do košíku', 'kontaktujte', 'objednejte',
    'poptat', 'vyzkoušet', 'stáhnout', 'zavolat', 'napište nám', 'nezávazn'];
  const benefitKw = ['výhod', 'proč', 'garanc', 'zaruč', 'zdarma', 'doprava zdarma',
    'vrácení', 'recenz', 'hodnocení', 'spokojen', 'kvalit', 'originál', 'sleva', 'akce'];
  const socialKw = ['recenz', 'hodnocení', 'zákazník', 'klient', 'referenc', 'spokojeno', 'hvězd'];

  const hasCta = ctaKw.some(kw => text.includes(kw));
  const benefitCount = benefitKw.filter(kw => text.includes(kw)).length;
  const hasSocialProof = socialKw.some(kw => text.includes(kw));

  if (hasCta) { bgScore += 15; bgPassed.push('Stránka obsahuje výzvu k akci'); }
  else {
    bgScore -= 15; bgIssues.push('Chybí jasná výzva k akci – zákazník neví co má dělat dál');
    bgQuickWin = isEshop
      ? `Na stránce ${url}: Přidejte výrazné tlačítko "Přidat do košíku" nebo "Objednat" viditelné bez scrollování`
      : `Na stránce ${url}: Přidejte jasnou výzvu k akci jako "Poptat nabídku" nebo "Kontaktujte nás"`;
  }
  if (benefitCount >= 3) { bgScore += 15; bgPassed.push('Text komunikuje více benefitů pro zákazníka'); }
  else if (benefitCount >= 1) { bgScore += 5; bgPassed.push('Text zmiňuje některé benefity'); }
  else { bgScore -= 10; bgIssues.push('Text neříká zákazníkovi PROČ by měl nakoupit/objednat právě tady'); }

  if (hasSocialProof) { bgScore += 10; bgPassed.push('Stránka obsahuje sociální důkaz (recenze, hodnocení)'); }
  else if (isEshop && type !== 'blog') { bgScore -= 5; bgIssues.push('Chybí recenze nebo hodnocení – zákazníci nemají důvod důvěřovat'); }

  if (!bgQuickWin && bgIssues.length > 0)
    bgQuickWin = isEshop
      ? `Na stránce ${url}: Přidejte sekci "Proč nakoupit u nás" s 3 konkrétními výhodami`
      : `Na stránce ${url}: Přidejte sekci "Proč s námi" s 3 konkrétními důvody`;

  const bgHeadline = bgScore >= 70 ? 'Dobře komunikované benefity' : bgScore >= 45 ? 'Benefity potřebují posílit' : 'Chybí důvody k akci';
  const bgSummary = bgScore >= 70
    ? 'Stránka poměrně dobře komunikuje proč by zákazník měl využít nabídku.'
    : bgScore >= 45
      ? 'Stránka by mohla lépe vysvětlit, co zákazník získá a proč by měl jednat.'
      : 'Zákazník nemá jasný důvod proč by měl na této stránce nakoupit nebo kontaktovat firmu.';

  // ── emotionalTone ─────────────────────────────────────────────────────────
  let etScore = 60;
  const etIssues = [];
  const etPassed = [];
  let etQuickWin = '';
  let tone = 'neutrální';

  const personalPronouns = (text.match(/\bvy\b|\bvás\b|\bvám\b|\bváš\b|\bvaš[eií]\b|\bvašich\b/gi) || []).length;
  const techWords = (text.match(/\bimplementace\b|\boptimalizace\b|\binfrastruktur|\bsystém\b|\btechnolog|\bparametr/gi) || []).length;

  if (personalPronouns >= 3) {
    etScore += 15; tone = 'přátelský';
    etPassed.push('Text mluví přímo k zákazníkovi (vy, vám, váš)');
  } else if (personalPronouns === 0 && wordCount > 100) {
    etScore -= 10;
    etIssues.push('Text nemluví k zákazníkovi – chybí osobní oslovení');
    etQuickWin = `Na stránce ${url}: Přeformulujte text tak, aby mluvil přímo k zákazníkovi – používejte "vy", "váš", "vám"`;
  }

  if (techWords >= 3 && personalPronouns < 2) {
    tone = 'technický'; etScore -= 5;
    etIssues.push('Text je příliš technický – může odradit běžné zákazníky');
  }

  if (wordCount >= 100 && etIssues.length === 0 && personalPronouns >= 1) {
    etScore += 10;
    tone = personalPronouns >= 3 ? 'přátelský' : 'důvěryhodný';
  }

  if (!etQuickWin && etIssues.length > 0)
    etQuickWin = `Na stránce ${url}: Přepište klíčové odstavce tak, aby mluvily přímo k zákazníkovi a vysvětlovaly benefit`;

  const etHeadline = etScore >= 70 ? 'Příjemný tón textu' : etScore >= 45 ? 'Tón textu je průměrný' : 'Tón textu odrazuje';
  const etSummary = etScore >= 70
    ? `Text působí ${tone} dojmem, zákazník se cítí osloven osobně.`
    : etScore >= 45
      ? `Text působí ${tone} dojmem, ale mohl by být více zaměřený na zákazníka.`
      : `Text působí ${tone} dojmem – zákazník se nemusí cítit osloven.`;

  // ── contentQuality ────────────────────────────────────────────────────────
  let cqScore = 60;
  const cqIssues = [];
  const cqPassed = [];
  let cqQuickWin = '';
  let isGeneric = false;

  const minWords = type === 'product' ? 200 : type === 'category' ? 150 : type === 'blog' ? 300 : 100;

  if (wordCount >= minWords * 2) { cqScore += 20; cqPassed.push(`Obsáhlý text (${wordCount} slov) pomáhá SEO i zákazníkům`); }
  else if (wordCount >= minWords) { cqScore += 10; cqPassed.push(`Dostatečný rozsah textu (${wordCount} slov)`); }
  else if (wordCount >= 50) {
    cqScore -= 15;
    cqIssues.push(`Málo obsahu (${wordCount} slov) – zákazník nemá dostatek informací pro rozhodnutí`);
    cqQuickWin = `Na stránce ${url}: Rozšiřte text na minimálně ${minWords} slov – popište detaily, výhody a odpovězte na otázky zákazníků`;
  } else {
    cqScore -= 30; isGeneric = true;
    cqIssues.push(`Prakticky žádný obsah (${wordCount} slov) – stránka neposkytuje hodnotu`);
    cqQuickWin = `Na stránce ${url}: Napište alespoň ${minWords} slov kvalitního obsahu popisujícího co stránka nabízí`;
  }

  if (h2.length >= 2 && wordCount >= 150) { cqScore += 10; cqPassed.push('Text je dobře strukturován nadpisy'); }
  else if (h2.length === 0 && wordCount >= 200) {
    cqScore -= 10;
    cqIssues.push('Dlouhý text bez podnadpisů – těžko se čte a zákazník ho přeskočí');
    if (!cqQuickWin) cqQuickWin = `Na stránce ${url}: Rozdělte text do sekcí s H2 nadpisy – každá sekce 1 téma/benefit`;
  }

  if (/lorem ipsum|placeholder|coming soon|ve výstavbě|připravujeme/i.test(text)) {
    cqScore -= 30; isGeneric = true;
    cqIssues.push('Stránka obsahuje zástupný text – zákazník to vidí jako nedokončený web');
  }

  if (!cqQuickWin && cqIssues.length > 0)
    cqQuickWin = `Na stránce ${url}: Přidejte relevantní obsah a odpovědi na otázky, které zákazníci nejčastěji mají`;

  const cqHeadline = cqScore >= 70 ? 'Kvalitní obsah' : cqScore >= 45 ? 'Obsah potřebuje vylepšit' : 'Slabý obsah';
  const cqSummary = cqScore >= 70
    ? 'Obsah stránky je dostatečně obsáhlý a strukturovaný pro zákazníky i vyhledávače.'
    : cqScore >= 45
      ? 'Obsah stránky splňuje základy, ale je prostor pro rozšíření a zlepšení struktury.'
      : 'Obsah stránky je nedostatečný – zákazník nemá dost informací pro rozhodnutí.';

  return {
    firstImpression: { score: clamp(fiScore), headline: fiHeadline, summary: fiSummary, issues: fiIssues, passed: fiPassed, quickWin: fiQuickWin || '' },
    benefitGap: { score: clamp(bgScore), headline: bgHeadline, summary: bgSummary, issues: bgIssues, passed: bgPassed, quickWin: bgQuickWin || '' },
    emotionalTone: { score: clamp(etScore), tone, headline: etHeadline, summary: etSummary, issues: etIssues, passed: etPassed, quickWin: etQuickWin || '' },
    contentQuality: { score: clamp(cqScore), isGeneric, headline: cqHeadline, summary: cqSummary, issues: cqIssues, passed: cqPassed, quickWin: cqQuickWin || '' }
  };
}

module.exports = { analyzePageRules, checkDuplicates, calculatePageScore, generateContentAnalysis };
