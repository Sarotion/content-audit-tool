import { useState, useEffect } from 'react'

const STEPS = [
  { id: 'crawl',   label: 'Procházím stránky webu',      duration: 8000 },
  { id: 'seo',     label: 'Kontroluji SEO základy',       duration: 4000 },
  { id: 'content', label: 'Analyzuji kvalitu obsahu',     duration: 6000 },
  { id: 'ai',      label: 'AI hodnotí texty a copy',      duration: 8000 },
  { id: 'links',   label: 'Hledám broken linky',          duration: 4000 },
  { id: 'score',   label: 'Sestavuji výsledné skóre',     duration: 3000 },
]

const TOTAL_DURATION = STEPS.reduce((s, step) => s + step.duration, 0)

function getTime() {
  const d = new Date()
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(n => String(n).padStart(2, '0')).join(':')
}

const LOG_ENTRIES = [
  { text: 'Fetching robots.txt...', type: 'info',    delay: 400 },
  { text: 'Analyzing sitemap.xml...', type: 'info',  delay: 1600 },
  { text: 'Crawling homepage...', type: 'info',      delay: 3000 },
  { text: 'Internal links mapped.', type: 'success', delay: 5200 },
  { text: 'Checking title tags & meta descriptions...', type: 'info', delay: 7000 },
  { text: 'Analyzing H1–H3 heading structure...', type: 'info', delay: 9500 },
  { text: 'Detecting thin & duplicate content...', type: 'info', delay: 11500 },
  { text: 'Sending content to AI for analysis...', type: 'info', delay: 13500 },
  { text: 'Evaluating benefit gap & emotional tone...', type: 'info', delay: 17000 },
  { text: 'Checking OpenGraph & schema.org...', type: 'info', delay: 20000 },
  { text: 'Computing final scores...', type: 'info', delay: 25000 },
]

export default function AuditProgress({ url }) {
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState(0)
  const [visibleLogs, setVisibleLogs] = useState([])
  const [startTime] = useState(getTime)

  useEffect(() => {
    let elapsed = 0
    const interval = setInterval(() => {
      elapsed += 100
      setProgress(Math.min((elapsed / TOTAL_DURATION) * 100, 97))

      let accum = 0
      for (let i = 0; i < STEPS.length; i++) {
        accum += STEPS[i].duration
        if (elapsed < accum) { setCurrentStep(i); break }
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const timers = LOG_ENTRIES.map((entry, i) =>
      setTimeout(() => {
        setVisibleLogs(prev => [...prev, { ...entry, time: getTime(), id: i }])
      }, entry.delay)
    )
    return () => timers.forEach(clearTimeout)
  }, [])

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      {/* Spinner + title */}
      <div className="text-center mb-10 fade-up">
        {/* Circular spinner */}
        <div className="flex justify-center mb-6">
          <svg className="animate-spin" width="56" height="56" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="23" stroke="#E5E7EB" strokeWidth="4"/>
            <circle
              cx="28" cy="28" r="23"
              stroke="#B72C6A"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="144"
              strokeDashoffset="108"
            />
          </svg>
        </div>

        <h2 className="font-display text-2xl font-700 text-text-primary mb-3">
          Analyzujeme váš web...
        </h2>

        {/* URL badge */}
        <div className="inline-flex items-center bg-surface border border-border rounded-lg px-3 py-1.5">
          <span className="font-mono text-sm text-text-secondary">{url}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-text-secondary">Průběh analýzy</span>
          <span className="text-sm font-mono text-accent font-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step list */}
      <div className="space-y-2 mb-8">
        {STEPS.map((step, i) => {
          const done    = i < currentStep
          const active  = i === currentStep
          const pending = i > currentStep

          return (
            <div key={step.id} className="flex items-center gap-3">
              {/* Icon */}
              <span className="shrink-0">
                {done ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="#B72C6A"/>
                    <path d="M6 10l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : active ? (
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="8" stroke="#E5E7EB" strokeWidth="2.5"/>
                    <circle cx="10" cy="10" r="8" stroke="#B72C6A" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="50" strokeDashoffset="38"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="9" stroke="#D1D5DB" strokeWidth="2"/>
                  </svg>
                )}
              </span>
              {/* Label */}
              <span className={`text-sm ${
                done ? 'text-text-secondary' : active ? 'text-accent font-600' : 'text-muted'
              }`}>
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Dark terminal log */}
      <div className="rounded-xl overflow-hidden border border-gray-700">
        <div className="bg-gray-900 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-gray-500 font-mono">audit.log</span>
        </div>
        <div className="bg-gray-900 p-4 h-40 overflow-y-auto space-y-1.5">
          {visibleLogs.map(entry => (
            <div key={entry.id} className="flex items-start gap-2 font-mono text-xs fade-up">
              <span className="text-gray-500 shrink-0 select-none">{entry.time}</span>
              <span className={
                entry.type === 'success' ? 'text-green-400' :
                entry.type === 'warn'    ? 'text-yellow-400' :
                'text-gray-300'
              }>
                [{entry.type === 'success' ? 'SUCCESS' : entry.type === 'warn' ? 'WARN' : 'INFO'}]
              </span>
              <span className={
                entry.type === 'success' ? 'text-green-300' :
                entry.type === 'warn'    ? 'text-yellow-300' :
                'text-gray-400'
              }>
                {entry.text}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1 font-mono text-xs text-gray-500">
            <span>›</span><span className="cursor">_</span>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-muted mt-5 italic">
        Průměrná doba analýzy: 30–60 sekund
      </p>
    </div>
  )
}
