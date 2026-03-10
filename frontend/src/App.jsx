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

  async function submitLead(contact) {
    // Fire-and-forget HubSpot save – don't block showing results
    fetch(`${import.meta.env.VITE_API_URL}/api/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contact, auditData })
    }).catch(() => {})

    setStep('results')
  }

  function restart() {
    setStep('input')
    setUrl('')
    setAuditData(null)
    setError(null)
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background elements */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="scan-line" />

      {/* Header */}
      <header className="relative z-10 border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
              <span className="text-base font-mono text-black font-bold">A</span>
            </div>
            <span className="font-display font-700 text-sm tracking-wide text-text-primary">
              Content<span className="text-accent">Audit</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent pulse-glow" />
            <span className="text-xs font-mono text-muted">BETA</span>
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
          <Results auditData={auditData} onRestart={restart} />
        )}
      </main>
    </div>
  )
}
