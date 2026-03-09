import { useState, useEffect } from 'react'

const STEPS = [
  { id: 'crawl',    label: 'Procházím stránky webu',         duration: 8000 },
  { id: 'seo',      label: 'Kontroluji SEO základy',          duration: 4000 },
  { id: 'content',  label: 'Analyzuji kvalitu obsahu',        duration: 6000 },
  { id: 'ai',       label: 'AI hodnotí texty a copy',         duration: 8000 },
  { id: 'links',    label: 'Hledám broken linky',             duration: 4000 },
  { id: 'score',    label: 'Sestavuji výsledné skóre',        duration: 3000 },
]

const TOTAL_DURATION = STEPS.reduce((s, step) => s + step.duration, 0)

function TerminalLine({ text, delay = 0, type = 'info' }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  if (!visible) return null

  const colors = {
    info: 'text-text-secondary',
    success: 'text-accent',
    warn: 'text-yellow-400',
    dim: 'text-muted'
  }

  return (
    <div className={`font-mono text-xs flex items-start gap-2 fade-up ${colors[type]}`}>
      <span className="text-muted mt-0.5 shrink-0">
        {type === 'success' ? '✓' : type === 'warn' ? '⚠' : '›'}
      </span>
      <span>{text}</span>
    </div>
  )
}

export default function AuditProgress({ url }) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [terminalLines, setTerminalLines] = useState([])

  // Simulate progress
  useEffect(() => {
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 100
      const pct = Math.min((elapsed / TOTAL_DURATION) * 100, 97)
      setProgress(pct)

      // Update current step
      let accum = 0
      for (let i = 0; i < STEPS.length; i++) {
        accum += STEPS[i].duration
        if (elapsed < accum) { setCurrentStep(i); break; }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [])

  // Build terminal lines
  useEffect(() => {
    const lines = [
      { text: `Spouštím audit: ${url}`, delay: 200, type: 'info' },
      { text: 'Načítám homepage...', delay: 800, type: 'dim' },
      { text: 'Hledám interní odkazu a podstránky...', delay: 2000, type: 'dim' },
      { text: 'Identifikuji produktové stránky', delay: 3500, type: 'dim' },
      { text: 'Kategoriové stránky nalezeny', delay: 5000, type: 'success' },
      { text: 'Kontroluji title tagy a meta descriptions...', delay: 7000, type: 'dim' },
      { text: 'Analyzuji strukturu nadpisů H1–H3', delay: 9000, type: 'dim' },
      { text: 'Detekuji thin content a duplicitní texty', delay: 11000, type: 'dim' },
      { text: 'Odesílám obsah do AI pro hlubší analýzu...', delay: 13000, type: 'info' },
      { text: 'Hodnotím benefit gap a emoční tón', delay: 16000, type: 'dim' },
      { text: 'Prověřuji OpenGraph a schema.org data', delay: 19000, type: 'dim' },
      { text: 'Počítám celkové skóre...', delay: 25000, type: 'info' },
    ]
    setTerminalLines(lines)
  }, [url])

  const stepsDone = STEPS.filter((_, i) => i < currentStep).length

  return (
    <div className="max-w-2xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-12 fade-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border mb-6">
          <svg className="animate-spin" width="28" height="28" fill="none" stroke="#4ade80" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 className="font-display text-2xl font-700 text-text-primary mb-2">
          Analyzuji váš web...
        </h2>
        <p className="text-muted text-sm font-mono">{url}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-mono text-muted">
            {STEPS[currentStep]?.label || 'Dokončuji...'}
          </span>
          <span className="text-xs font-mono text-accent">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-card rounded-full overflow-hidden border border-border">
          <div
            className="h-full bg-gradient-to-r from-accent to-green-400 rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step checklist */}
      <div className="grid grid-cols-2 gap-2 mb-8">
        {STEPS.map((step, i) => (
          <div
            key={step.id}
            className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 border transition-all duration-300 ${
              i < currentStep
                ? 'border-accent/30 bg-accent/5 text-accent'
                : i === currentStep
                ? 'border-border bg-card text-text-primary animate-pulse'
                : 'border-border/30 text-muted'
            }`}
          >
            <span className="shrink-0">
              {i < currentStep ? '✓' : i === currentStep ? '›' : '○'}
            </span>
            <span className="font-mono">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Terminal output */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
          <span className="ml-2 text-xs font-mono text-muted">audit.log</span>
        </div>
        <div className="p-4 space-y-1.5 min-h-[160px]">
          {terminalLines.map((line, i) => (
            <TerminalLine key={i} {...line} />
          ))}
          <div className="flex items-center gap-1 font-mono text-xs text-accent mt-1">
            <span>›</span>
            <span className="cursor">_</span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted mt-6">
        Průměrná doba analýzy: 30–60 sekund
      </p>
    </div>
  )
}
