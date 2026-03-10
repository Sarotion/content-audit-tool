import { useState } from 'react'
import UrlInput from './components/UrlInput'
import AuditProgress from './components/AuditProgress'
import LeadGate from './components/LeadGate'
import Results from './components/Results'
import ScoreRing from './components/ScoreRing'

// Steps: 'input' → 'loading' → 'gate' → 'results'

// Detect any kind of embedding once at module load (stable, no React state needed).
// When embedded we:
//   1. Remove min-h-screen → eliminates circular height dependency with postMessage
//   2. Replace position:fixed sticky bar → fixed is relative to iframe viewport,
//      causing overlap & wrong scrollHeight. We use a normal in-flow bar instead.
//
// Two embedding modes:
//  – iframe:  window.self !== window.top (detected automatically)
//  – widget:  widget.jsx sets window.__GF_EMBEDDED__ = true before mounting
const isEmbedded = window.self !== window.top || !!window.__GF_EMBEDDED__

export default function App() {
  const [step, setStep] = useState('input')
  const [url, setUrl] = useState('')
  const [auditData, setAuditData] = useState(null)
  const [error, setError] = useState(null)
  const [contact, setContact] = useState(null)

  async function startAudit(inputUrl) {
    setUrl(inputUrl)
    setError(null)
    setStep('loading')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Audit selhal')
      }

      setAuditData(data)
      setStep('gate')
    } catch (err) {
      setError(err.message)
      setStep('input')
    }
  }

  async function submitLead(contactData) {
    setContact(contactData)

    // Fire-and-forget save to HubSpot
    fetch(`${import.meta.env.VITE_API_URL}/api/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact: contactData, auditData })
    }).catch(() => {})

    setStep('results')
  }

  function restart() {
    setStep('input')
    setUrl('')
    setAuditData(null)
    setError(null)
    setContact(null)
  }

  const score = auditData?.overallScore
  const scoreCol = score >= 70 ? '#22c55e' : score >= 50 ? '#F59E0B' : '#ef4444'
  const scoreLbl = score >= 70 ? 'Dobrý základ' : score >= 50 ? 'Potřebuje práci' : 'Kritický stav'

  const showStickyBar = step === 'results' && auditData

  return (
    // min-h-screen is intentionally omitted when embedded:
    // it creates a circular dependency where 100vh grows with each postMessage update.
    <div className={`relative bg-base overflow-x-hidden ${isEmbedded ? '' : 'min-h-screen'}`}>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="https://getfound.cz" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-display font-700 text-base text-text-primary">
              Get<span className="text-accent">Found</span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            {step === 'results' && (
              <button
                onClick={restart}
                className="text-xs font-mono text-muted hover:text-accent transition-colors hidden sm:block"
              >
                ← Nový audit
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent pulse-glow" />
              <span className="text-xs font-mono text-muted hidden sm:block">Content Audit Tool</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content — extra bottom padding in results so content isn't hidden behind the bar */}
      <main className={showStickyBar && !isEmbedded ? 'pb-20' : ''}>
        {step === 'input'   && <UrlInput onSubmit={startAudit} error={error} />}
        {step === 'loading' && <AuditProgress url={url} />}
        {step === 'gate'    && auditData && <LeadGate auditData={auditData} onSubmit={submitLead} />}
        {step === 'results' && auditData && <Results auditData={auditData} onRestart={restart} contact={contact} />}
      </main>

      {/* Footer (hidden in results – bar takes over) */}
      {step !== 'results' && (
        <footer className="border-t border-border mt-16 py-6">
          <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted">© 2025 GetFound s.r.o. – Nástroj pro analýzu obsahu e-shopů</p>
            <a href="https://getfound.cz" target="_blank" rel="noopener noreferrer"
              className="text-xs text-muted hover:text-accent transition-colors">
              getfound.cz →
            </a>
          </div>
        </footer>
      )}

      {/* ── Bottom bar (results only) ── */}

      {/* Standalone: fixed to bottom of browser viewport */}
      {showStickyBar && !isEmbedded && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ScoreRing score={score} size={40} strokeWidth={4} />
              <div>
                <div className="text-xs text-muted">Celkové skóre</div>
                <div className="text-sm font-600" style={{ color: scoreCol }}>{scoreLbl}</div>
              </div>
            </div>
            <a
              href="https://getfound.cz/kontakt/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-accent text-white font-display font-700 text-sm rounded-lg px-5 py-2.5 hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              Domluvit konzultaci
            </a>
          </div>
        </div>
      )}

      {/* Embedded (iframe): in-flow bar at bottom of content, no position:fixed */}
      {showStickyBar && isEmbedded && (
        <div className="bg-white border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)] mt-8">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <ScoreRing score={score} size={40} strokeWidth={4} />
              <div>
                <div className="text-xs text-muted">Celkové skóre</div>
                <div className="text-sm font-600" style={{ color: scoreCol }}>{scoreLbl}</div>
              </div>
            </div>
            <a
              href="https://getfound.cz/kontakt/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-accent text-white font-display font-700 text-sm rounded-lg px-5 py-2.5 hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              Domluvit konzultaci
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
