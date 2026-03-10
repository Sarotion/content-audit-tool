import { useState } from 'react'

const EXAMPLES = ['mujeshop.cz', 'nakupuj.cz', 'moda-online.cz']

function FeaturePill({ label }) {
  return (
    <div className="flex items-center gap-1.5 bg-accent-light border border-accent/20 rounded-full px-3 py-1.5">
      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
      <span className="text-xs text-accent font-body font-500">{label}</span>
    </div>
  )
}

function StatItem({ value, label }) {
  return (
    <div className="text-center">
      <div className="font-display text-3xl font-700 text-accent">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  )
}

export default function UrlInput({ onSubmit, error }) {
  const [url, setUrl] = useState('')
  const [focused, setFocused] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (url.trim()) onSubmit(url.trim())
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16 md:py-24">
      {/* Hero */}
      <div className="text-center mb-14 fade-up fade-up-1">
        <div className="inline-flex items-center gap-2 bg-accent-light border border-accent/20 rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-xs font-body font-500 text-accent uppercase tracking-widest">Zdarma · Bez registrace</span>
        </div>

        <h1 className="font-display text-4xl md:text-6xl font-700 text-text-primary leading-tight mb-6">
          Víte, proč váš e-shop<br />
          <span className="text-accent">nezíská více zákazníků?</span>
        </h1>

        <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          Bezplatný audit obsahu odhalí slabiny v textech, SEO a struktuře stránek.
          Výsledky za méně než minutu.
        </p>
      </div>

      {/* URL Input */}
      <div className="max-w-2xl mx-auto mb-8 fade-up fade-up-2">
        <form onSubmit={handleSubmit}>
          <div className={`relative rounded-xl border-2 transition-all duration-200 bg-white shadow-sm ${
            focused
              ? 'border-accent shadow-[0_0_0_4px_rgba(183,44,106,0.08)]'
              : 'border-border-mid'
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
                className="m-1.5 px-6 py-3 bg-accent text-white font-display font-600 text-sm rounded-lg
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
        </form>

        {/* Example URLs */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-muted">Příklady:</span>
          {EXAMPLES.map(ex => (
            <button
              key={ex}
              onClick={() => setUrl('https://' + ex)}
              className="text-xs font-mono text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-14 fade-up fade-up-3">
        <FeaturePill label="Title & Meta description" />
        <FeaturePill label="Kvalita produktových textů" />
        <FeaturePill label="Benefit gap analýza" />
        <FeaturePill label="Struktura nadpisů" />
        <FeaturePill label="OpenGraph & Sdílení" />
        <FeaturePill label="Broken links" />
        <FeaturePill label="Schema.org data" />
        <FeaturePill label="Emoční tón copy" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto fade-up fade-up-4 py-8 border-t border-border">
        <StatItem value="11" label="oblastí auditu" />
        <StatItem value="<60s" label="rychlost analýzy" />
        <StatItem value="100%" label="zdarma" />
      </div>
    </div>
  )
}
