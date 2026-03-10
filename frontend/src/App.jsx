import { useState } from 'react'
import UrlInput from './components/UrlInput'
import AuditProgress from './components/AuditProgress'
import LeadGate from './components/LeadGate'
import Results from './components/Results'

// Steps: 'input' → 'loading' → 'gate' → 'results'

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
    // Store contact for PDF upload later
    setContact(contactData)

    // Fire-and-forget HubSpot save – don't block showing results
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

  return (
    <div className="relative min-h-screen bg-base overflow-x-hidden">
      {/* Subtle bg gradient */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true" />

      {/* Header */}
      <header className="relative z-10 bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <a href="https://getfound.cz" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm font-display">G</span>
            </div>
            <span className="font-display font-700 text-base text-text-primary tracking-tight">
              Get<span className="text-accent">Found</span>
            </span>
          </a>

          {/* Badge */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent pulse-glow" />
            <span className="text-xs font-mono text-muted hidden sm:block">Content Audit Tool</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10">
        {step === 'input' && (
          <UrlInput onSubmit={startAudit} error={error} />
        )}
        {step === 'loading' && (
          <AuditProgress url={url} />
        )}
        {step === 'gate' && auditData && (
          <LeadGate auditData={auditData} onSubmit={submitLead} />
        )}
        {step === 'results' && auditData && (
          <Results auditData={auditData} onRestart={restart} contact={contact} />
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border mt-16 py-6">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted">© 2025 GetFound s.r.o. – Nástroj pro analýzu obsahu e-shopů</p>
          <a href="https://getfound.cz" target="_blank" rel="noopener noreferrer"
            className="text-xs text-muted hover:text-accent transition-colors">
            getfound.cz →
          </a>
        </div>
      </footer>
    </div>
  )
}
