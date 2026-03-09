# Content Audit Tool 🔍

Bezplatný lead gen nástroj pro automatizovaný audit obsahu e-shopů a webů.
Uživatel zadá URL → nástroj audituje obsah → výsledky se odemknou po zadání kontaktu → kontakt + výsledky se odešlou do HubSpotu.

## Co nástroj testuje

### Automaticky (rule-based)
- **Title tagy** – délka, přítomnost, duplicity
- **Meta description** – délka, CTA, unikátnost
- **Struktura nadpisů** – H1/H2/H3 hierarchie
- **Thin content** – stránky s nedostatečným textem
- **Obrázky** – chybějící/generické alt texty
- **Structured data** – schema.org Product, BreadcrumbList
- **OpenGraph** – title, description, image pro sociální sítě
- **URL struktura** – délka, čitelnost
- **Broken interní linky** – 404 chyby
- **Duplicitní titulky/popisky** – across pages

### AI analýza (Claude)
- **First impression** – co návštěvník pochopí jako první
- **Benefit gap** – odpovídá copy na otázku "proč koupit"?
- **Emoční tón** – technický / prodejní / důvěryhodný
- **Kvalita obsahu** – generické vs. unikátní popisy
- **Site-wide doporučení** – keyword kanibalizace, celkový stav

## Tech stack

| | Technologie | Hosting |
|---|---|---|
| Backend | Node.js + Express | Railway |
| Frontend | React + Vite + Tailwind | Vercel |
| AI | Claude claude-sonnet-4-20250514 | Anthropic API |
| CRM | HubSpot Contacts + Notes API | HubSpot |

## Rychlý start

### 1. Klonovat repozitář
```bash
git clone https://github.com/vas-username/content-audit-tool
cd content-audit-tool
```

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env
# Vyplňte ANTHROPIC_API_KEY a HUBSPOT_TOKEN v .env
npm run dev
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend bude dostupný na `http://localhost:5173`, backend na `http://localhost:3001`.

## Konfigurace .env

```env
PORT=3001
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-...
HUBSPOT_TOKEN=pat-...
```

### Jak získat HubSpot token
1. Jděte na **Nastavení → Integrace → Private Apps**
2. Vytvořte novou app s názvem *Content Audit Tool*
3. Scopes: `crm.objects.contacts.write`, `crm.objects.contacts.read`, `crm.objects.notes.write`
4. Zkopírujte token začínající `pat-`

### Jak získat Anthropic API key
1. Přejděte na [console.anthropic.com](https://console.anthropic.com)
2. API Keys → Create Key

## Deployment

### Backend na Railway
1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Vyberte složku `backend`
3. Přidejte Environment Variables z `.env`
4. Railway automaticky detekuje Node.js a nasadí

### Frontend na Vercel
1. [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Root Directory: `frontend`
3. Přidejte Environment Variable: `VITE_API_URL=https://vas-backend.railway.app`
4. Vercel automaticky nasadí

> **Důležité:** Po deployi aktualizujte `FRONTEND_URL` v Railway na vaši Vercel doménu.

## HubSpot custom properties (doporučené)

Vytvořte v HubSpotu tyto vlastní vlastnosti kontaktu:
- `content_audit_score` (Number) – celkové skóre 0–100
- `content_audit_date` (Date) – datum auditu
- `content_audit_url` (Single-line text) – auditovaný web

**Nastavení → Správa dat → Vlastnosti → Vytvořit vlastnost**

## Struktura projektu

```
content-audit-tool/
├── backend/
│   ├── server.js              # Express server
│   ├── routes/
│   │   ├── audit.js           # POST /api/audit
│   │   └── lead.js            # POST /api/lead
│   ├── services/
│   │   ├── crawler.js         # Web crawler (cheerio + axios)
│   │   ├── analyzer.js        # Rule-based SEO checks
│   │   ├── aiAnalyzer.js      # Claude AI analysis
│   │   └── hubspot.js         # HubSpot integration
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app + state machine
│   │   └── components/
│   │       ├── UrlInput.jsx   # Step 1: URL zadání
│   │       ├── AuditProgress.jsx # Step 2: Loading
│   │       ├── LeadGate.jsx   # Step 3: Kontaktní formulář
│   │       ├── Results.jsx    # Step 4: Výsledky
│   │       └── ScoreRing.jsx  # SVG score kroužek
│   └── ...
└── README.md
```

## Přizpůsobení

### Změna emailu v CTA (Results.jsx)
Najděte `info@vaseagency.cz` v `frontend/src/components/Results.jsx` a nahraďte vlastním emailem.

### Počet crawlovaných stránek
V `backend/services/crawler.js` změňte `MAX_PAGES` (výchozí: 10).

### Scoring váhy
V `backend/routes/audit.js` upravte objekt `weights` pro změnu důležitosti jednotlivých oblastí.

## Licence

MIT – volně použitelné a upravitelné.
