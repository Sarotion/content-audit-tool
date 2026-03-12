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

  async function startAudit({ url: inputUrl, hintCategory, hintProduct, hintBlog }) {
    setUrl(inputUrl)
    setError(null)
    setStep('loading')

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: inputUrl, hintCategory, hintProduct, hintBlog })
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
    // min-h-screen intentionally omitted when embedded (avoids circular height dependency)
    <div className={`relative bg-base overflow-x-hidden ${isEmbedded ? '' : 'min-h-screen'}`}>

      {/* Minimal back-link shown only in results – no full header branding */}
      {step === 'results' && (
        <div className="max-w-5xl mx-auto px-6 pt-5">
          <button
            onClick={restart}
            className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent transition-colors"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Nový audit
          </button>
        </div>
      )}

      {/* Main content — extra bottom padding in results so content isn't hidden behind the bar */}
      <main className={showStickyBar && !isEmbedded ? 'pb-20' : ''}>
        {step === 'input'   && <UrlInput onSubmit={startAudit} error={error} />}
        {step === 'loading' && <AuditProgress url={url} />}
        {step === 'gate'    && auditData && <LeadGate auditData={auditData} onSubmit={submitLead} />}
        {step === 'results' && auditData && <Results auditData={auditData} onRestart={restart} contact={contact} />}
      </main>

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
              className="bg-accent text-white font-display font-700 text-sm rounded-full px-6 py-2.5 hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              Domluvit konzultaci
            </a>
          </div>
        </div>
      )}

      {/* Embedded (iframe / widget): in-flow bar at bottom of content */}
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
              className="bg-accent text-white font-display font-700 text-sm rounded-full px-6 py-2.5 hover:bg-accent-hover transition-colors whitespace-nowrap"
            >
              Domluvit konzultaci
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
