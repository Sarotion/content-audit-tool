import { useState } from 'react'

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
      </svg>
    ),
    label: 'Title & Meta description'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
    label: 'Kvalita produktových textů'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
      </svg>
    ),
    label: 'Benefit gap analýza'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h6"/>
      </svg>
    ),
    label: 'Struktura nadpisů'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
      </svg>
    ),
    label: 'OpenGraph & Sdílení'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
      </svg>
    ),
    label: 'Broken links'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"/>
      </svg>
    ),
    label: 'Schema.org data'
  },
  {
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      </svg>
    ),
    label: 'Emoční tón copy'
  },
]

function HintField({ label, placeholder, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-600 text-muted mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white border border-border rounded-lg px-3 py-2 text-xs font-mono text-text-primary placeholder-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
        autoComplete="off"
        spellCheck={false}
      />
    </div>
  )
}

export default function UrlInput({ onSubmit, error }) {
  const [url, setUrl] = useState('')
  const [focused, setFocused] = useState(false)
  const [hintCategory, setHintCategory] = useState('')
  const [hintProduct, setHintProduct] = useState('')
  const [hintBlog, setHintBlog] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    if (url.trim()) onSubmit({
      url: url.trim(),
      hintCategory: hintCategory.trim() || null,
      hintProduct: hintProduct.trim() || null,
      hintBlog: hintBlog.trim() || null,
    })
  }


  return (
    <div className="max-w-4xl mx-auto px-6 py-14 md:py-20">
      {/* Hero */}
      <div className="text-center mb-10 fade-up fade-up-1">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 border border-accent/30 bg-accent-light rounded-full px-4 py-1.5 mb-7">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#B72C6A" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span className="text-xs font-body font-600 text-accent">Zdarma · Bez registrace</span>
        </div>

        <h1 className="font-display text-4xl md:text-6xl font-700 text-text-primary leading-tight mb-5">
          Víte, proč váš e-shop<br />
          nezíská více zákazníků?
        </h1>

        <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Bezplatný audit obsahu odhalí slabiny v textech, SEO a struktuře stránek.
          Výsledky za méně než minutu.
        </p>
      </div>

      {/* URL Input */}
      <div className="max-w-2xl mx-auto mb-10 fade-up fade-up-2">
        <form onSubmit={handleSubmit}>
          <div className={`relative rounded-xl border-2 transition-all duration-200 bg-white shadow-sm ${
            focused ? 'border-accent shadow-[0_0_0_4px_rgba(183,44,106,0.08)]' : 'border-border-mid'
          }`}>
            <div className="flex items-center">
              <div className="pl-4 pr-2 text-muted">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              <input
                type="text"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="www.vas-eshop.cz"
                className="flex-1 bg-transparent py-4 px-2 text-text-primary font-mono text-sm outline-none placeholder-muted"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="submit"
                disabled={!url.trim()}
                className="m-1.5 px-6 py-3 bg-accent text-white font-display font-600 text-sm rounded-full
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-accent-hover transition-colors duration-150 whitespace-nowrap"
              >
                Spustit audit →
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
              </svg>
              {error}
            </div>
          )}

          {/* Hint URLs for e-shop – always visible */}
          <div className="mt-3 rounded-xl border border-border bg-surface p-4 space-y-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              <strong className="text-text-primary">Zpřesnit audit e-shopu (volitelné):</strong>{' '}
              Vložte příklady klíčových stránek. Systém z nich pozná strukturu URL
              a zahrne do auditu správné typy stránek — kategorie, produkty i blog.
            </p>
            <div className="space-y-2">
              <HintField
                label="Příklad URL kategorie"
                placeholder="https://vas-eshop.cz/kategorie/nazev/"
                value={hintCategory}
                onChange={setHintCategory}
              />
              <HintField
                label="Příklad URL produktu"
                placeholder="https://vas-eshop.cz/produkt/nazev-produktu/"
                value={hintProduct}
                onChange={setHintProduct}
              />
              <HintField
                label="Příklad URL blogového článku"
                placeholder="https://vas-eshop.cz/blog/nazev-clanku/"
                value={hintBlog}
                onChange={setHintBlog}
              />
            </div>
          </div>
        </form>
      </div>

      {/* Feature cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12 fade-up fade-up-3">
        {FEATURES.map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2.5 bg-white border border-border rounded-xl px-3 py-3 shadow-sm"
          >
            <span className="text-accent shrink-0">{icon}</span>
            <span className="text-xs text-text-secondary leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-center gap-6 text-sm text-muted fade-up fade-up-4">
        <div className="flex items-center gap-1.5">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          <span>11 oblastí auditu</span>
        </div>
        <span className="text-border-mid">·</span>
        <div className="flex items-center gap-1.5">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><path strokeLinecap="round" d="M12 6v6l4 2"/>
          </svg>
          <span>&lt;60s rychlost analýzy</span>
        </div>
        <span className="text-border-mid">·</span>
        <div className="flex items-center gap-1.5">
          <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <span>100% zdarma</span>
        </div>
      </div>
    </div>
  )
}
