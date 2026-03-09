import { useState } from 'react'

const EXAMPLES = ['mujeshop.cz', 'nakupuj.cz', 'moda-online.cz']

function FeaturePill({ icon, label }) {
  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5">
      <span className="text-accent">{icon}</span>
      <span className="text-xs text-text-secondary font-body">{label}</span>
    </div>
  )
}

function StatItem({ value, label }) {
  return (
    <div className="text-center">
      <div className="font-display text-2xl font-bold text-accent">{value}</div>
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
        <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          <span className="text-xs font-mono text-muted uppercase tracking-widest">Zdarma · Bez registrace</span>
        </div>

        <h1 className="font-display text-4xl md:text-6xl font-800 text-text-primary leading-tight mb-6">
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
          <div className={`relative rounded-xl border transition-all duration-200 ${
            focused
              ? 'border-accent shadow-[0_0_0_3px_rgba(74,222,128,0.15)]'
              : 'border-border'
          } bg-card`}>
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
                className="m-1.5 px-6 py-3 bg-accent text-black font-display font-700 text-sm rounded-lg
                  disabled:opacity-40 disabled:cursor-not-allowed
                  hover:bg-green-300 transition-colors duration-150 whitespace-nowrap"
              >
                Spustit audit →
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
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
              className="text-xs font-mono text-indigo hover:text-accent transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 mb-14 fade-up fade-up-3">
        <FeaturePill icon="✦" label="Title & Meta description" />
        <FeaturePill icon="✦" label="Kvalita produktových textů" />
        <FeaturePill icon="✦" label="Benefit gap analýza" />
        <FeaturePill icon="✦" label="Struktura nadpisů" />
        <FeaturePill icon="✦" label="OpenGraph & Sdílení" />
        <FeaturePill icon="✦" label="Broken links" />
        <FeaturePill icon="✦" label="Schema.org data" />
        <FeaturePill icon="✦" label="Emoční tón copy" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 max-w-md mx-auto fade-up fade-up-4">
        <StatItem value="11" label="oblastí auditu" />
        <StatItem value="<60s" label="rychlost analýzy" />
        <StatItem value="100%" label="zdarma" />
      </div>
    </div>
  )
}
