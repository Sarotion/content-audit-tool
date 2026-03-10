import { useState } from 'react'
import ScoreRing from './ScoreRing'

function CategoryBar({ label, score }) {
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#F59E0B' : '#ef4444'
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 text-xs text-text-secondary shrink-0">{label}</div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <div className="w-7 text-xs font-mono font-600 text-right shrink-0" style={{ color }}>{score}</div>
    </div>
  )
}

export default function LeadGate({ auditData, onSubmit }) {
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const score      = auditData.overallScore
  const scoreColor = score >= 70 ? '#22c55e' : score >= 50 ? '#F59E0B' : '#ef4444'
  const scoreLabel = score >= 70 ? 'Dobrý základ' : score >= 50 ? 'Potřebuje práci' : 'Kritický stav'

  const dupsCount = (auditData.duplicateTitles?.length || 0) + (auditData.duplicateDescriptions?.length || 0)
  const problemsCount = (auditData.topIssues?.length || 0) + (auditData.brokenLinksCount || 0) + dupsCount

  function validate() {
    const errs = {}
    if (!firstName.trim()) errs.firstName = 'Povinné pole'
    if (!email.trim()) errs.email = 'Povinné pole'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Neplatný e-mail'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setSubmitting(true)
    await onSubmit({ firstName: firstName.trim(), email: email.trim(), phone: phone.trim() })
    setSubmitting(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="grid md:grid-cols-2 gap-6 items-start">

        {/* ── Left: Score preview ── */}
        <div className="fade-up fade-up-1">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">

            {/* Score row */}
            <div className="flex items-center gap-5 mb-4">
              <ScoreRing score={score} size={88} strokeWidth={7} />
              <div>
                <div className="font-display text-2xl font-700" style={{ color: scoreColor }}>
                  {scoreLabel}
                </div>
                <div className="text-text-secondary text-sm mt-1">
                  {auditData.pagesAnalyzed} stránek · {auditData.brokenLinksCount} broken linků
                </div>
                {problemsCount > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 rounded-full px-2.5 py-0.5 text-xs font-600">
                    <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                    Zjištěno {problemsCount} problémů
                  </div>
                )}
              </div>
            </div>

            {/* Category label */}
            <div className="text-xs font-mono text-muted uppercase tracking-wide mb-3">
              Přehled kategorií
            </div>

            {/* Category bars */}
            <div className="space-y-2.5 mb-6">
              {Object.entries(auditData.categoryScores || {}).map(([label, val]) => (
                <CategoryBar key={label} label={label} score={val} />
              ))}
            </div>

            {/* Lock section */}
            <div className="border-t border-border pt-5 text-center">
              <div className="flex justify-center mb-3">
                <div className="w-11 h-11 bg-gray-900 rounded-full flex items-center justify-center">
                  <svg width="18" height="18" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path strokeLinecap="round" d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
              </div>
              <div className="text-sm font-600 text-text-primary mb-1">Odemkněte kompletní výsledky</div>
              <div className="text-xs text-muted">Zjistěte přesně, co a jak na webu opravit</div>
            </div>
          </div>
        </div>

        {/* ── Right: Custom form ── */}
        <div className="fade-up fade-up-2">
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="font-display text-xl font-700 text-text-primary mb-1">
              Zobrazte kompletní výsledky
            </h3>
            <p className="text-text-secondary text-sm mb-6">
              Dostanete plný report s konkrétními doporučeními pro {auditData.url?.replace(/^https?:\/\//, '').replace(/\/$/, '')}.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Jméno */}
              <div>
                <label className="block text-xs font-600 text-text-secondary mb-1.5">
                  Jméno <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => { setFirstName(e.target.value); setFieldErrors(p => ({ ...p, firstName: null })) }}
                  placeholder="Jan Novák"
                  className={`w-full bg-surface border rounded-lg px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors
                    placeholder-muted focus:border-accent focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,104,64,0.08)]
                    ${fieldErrors.firstName ? 'border-red-400 bg-red-50' : 'border-border'}`}
                />
                {fieldErrors.firstName && <p className="text-xs text-red-500 mt-1">{fieldErrors.firstName}</p>}
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-600 text-text-secondary mb-1.5">
                  Pracovní e-mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setFieldErrors(p => ({ ...p, email: null })) }}
                  placeholder="jan@vasespolecnost.cz"
                  className={`w-full bg-surface border rounded-lg px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors
                    placeholder-muted focus:border-accent focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,104,64,0.08)]
                    ${fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-border'}`}
                />
                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
              </div>

              {/* Telefon */}
              <div>
                <label className="block text-xs font-600 text-text-secondary mb-1.5">
                  Telefon <span className="text-muted font-normal">(nepovinné)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+420 123 456 789"
                  className="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors
                    placeholder-muted focus:border-accent focus:bg-white focus:shadow-[0_0_0_3px_rgba(27,104,64,0.08)]"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-accent text-white font-display font-700 rounded-lg py-3 text-sm
                  hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {submitting ? 'Odesílám...' : 'Zobrazit výsledky →'}
              </button>
            </form>

            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted">
              <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
              Vaše data jsou v bezpečí. Neposíláme spam.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
