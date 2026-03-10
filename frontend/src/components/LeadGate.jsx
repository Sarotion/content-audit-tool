import { useState } from 'react'
import ScoreRing from './ScoreRing'

function CategoryBar({ label, score }) {
  const color = score >= 71 ? '#22c55e' : score >= 41 ? '#F5D127' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-xs text-text-secondary shrink-0 text-right">{label}</div>
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden border border-border">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-8 text-xs font-mono text-right" style={{ color }}>{score}</div>
    </div>
  )
}

export default function LeadGate({ auditData, onSubmit }) {
  const [form, setForm] = useState({ firstName: '', email: '', phone: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const score = auditData.overallScore
  const scoreColor = score >= 71 ? '#22c55e' : score >= 41 ? '#F5D127' : '#ef4444'
  const scoreLabel = score >= 71 ? 'Dobrý základ' : score >= 41 ? 'Potřebuje práci' : 'Kritický stav'

  function validate() {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Zadejte jméno'
    if (!form.email.trim()) e.email = 'Zadejte email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Neplatný formát emailu'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true)
    await onSubmit(form)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-10 fade-up">
        <div className="inline-flex items-center gap-2 bg-white border border-border rounded-full px-4 py-1.5 mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreColor }} />
          <span className="text-xs font-mono text-muted uppercase tracking-widest">{scoreLabel}</span>
        </div>
        <h2 className="font-display text-3xl md:text-4xl font-700 text-text-primary mb-3">
          Váš audit je připraven
        </h2>
        <p className="text-text-secondary">
          Zadejte kontakt pro zobrazení kompletních výsledků a doporučení
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Score preview */}
        <div className="fade-up fade-up-1">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            {/* Overall score */}
            <div className="flex items-center gap-6 mb-6">
              <ScoreRing score={score} size={90} strokeWidth={7} />
              <div>
                <div className="font-display text-4xl font-700" style={{ color: scoreColor }}>
                  {score}<span className="text-muted text-xl font-400">/100</span>
                </div>
                <div className="text-text-secondary text-sm mt-1">{scoreLabel}</div>
                <div className="text-muted text-xs font-mono mt-1">
                  {auditData.pagesAnalyzed} stránek · {auditData.brokenLinksCount} broken linků
                </div>
              </div>
            </div>

            {/* Category scores */}
            <div className="space-y-3 mb-6">
              {Object.entries(auditData.categoryScores || {}).map(([label, score]) => (
                <CategoryBar key={label} label={label} score={score} />
              ))}
            </div>

            {/* Teaser issues (blurred) */}
            <div className="border-t border-border pt-4">
              <div className="text-xs font-mono text-muted mb-3 uppercase tracking-wide">Nalezené problémy</div>
              <div className="blur-gate space-y-2">
                {(auditData.topIssues || []).slice(0, 3).map((issue, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <span className="text-red-500 shrink-0 mt-0.5">⚠</span>
                    <span className="text-text-secondary">{issue}</span>
                  </div>
                ))}
                <div className="flex items-center justify-center py-4 text-muted text-xs font-mono">
                  🔒 Odemkněte kompletní výsledky
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Lead form */}
        <div className="fade-up fade-up-2">
          <div className="bg-white border border-accent/30 rounded-2xl p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="font-display text-xl font-700 text-text-primary mb-2">
                Zobrazte kompletní výsledky
              </h3>
              <p className="text-text-secondary text-sm">
                Dostanete plný report s konkrétními doporučeními jak zlepšit obsah a zvýšit konverze.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 uppercase tracking-wide">
                  Jméno *
                </label>
                <input
                  type="text"
                  placeholder="Jan Novák"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className={`w-full bg-surface border rounded-lg px-4 py-3 text-sm text-text-primary outline-none
                    focus:border-accent transition-colors placeholder-muted
                    ${errors.firstName ? 'border-red-400' : 'border-border'}`}
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 uppercase tracking-wide">
                  Pracovní email *
                </label>
                <input
                  type="email"
                  placeholder="jan@firma.cz"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={`w-full bg-surface border rounded-lg px-4 py-3 text-sm text-text-primary outline-none
                    focus:border-accent transition-colors placeholder-muted
                    ${errors.email ? 'border-red-400' : 'border-border'}`}
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-mono text-muted mb-1.5 uppercase tracking-wide">
                  Telefon <span className="normal-case text-muted/60">(nepovinné)</span>
                </label>
                <input
                  type="tel"
                  placeholder="+420 777 123 456"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text-primary
                    outline-none focus:border-accent transition-colors placeholder-muted"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-white font-display font-700 rounded-lg py-3.5 text-sm
                  hover:bg-accent-hover transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.49 8.49l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.49-8.49l2.83-2.83" />
                    </svg>
                    Zpracovávám...
                  </>
                ) : (
                  'Zobrazit výsledky →'
                )}
              </button>
            </form>

            <p className="text-center text-xs text-muted mt-4">
              Vaše data jsou v bezpečí. Neposíláme spam.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
