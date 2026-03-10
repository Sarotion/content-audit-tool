import { useEffect, useRef, useState } from 'react'
import ScoreRing from './ScoreRing'

const HUBSPOT_PORTAL_ID = '146612458'
const HUBSPOT_FORM_ID   = '608af3d8-7490-438e-9607-504c6702b702'

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
  const [formReady, setFormReady] = useState(false)
  // Captured from form fields just before HubSpot submits
  const capturedRef = useRef({ firstName: '', email: '', phone: '' })

  const score      = auditData.overallScore
  const scoreColor = score >= 71 ? '#22c55e' : score >= 41 ? '#F5D127' : '#ef4444'
  const scoreLabel = score >= 71 ? 'Dobrý základ' : score >= 41 ? 'Potřebuje práci' : 'Kritický stav'

  // ── Load & initialise HubSpot form ────────────────────────────────────────
  useEffect(() => {
    let mounted = true

    function initForm() {
      if (!mounted || !window.hbspt) return

      window.hbspt.forms.create({
        region:   'eu1',
        portalId: HUBSPOT_PORTAL_ID,
        formId:   HUBSPOT_FORM_ID,
        target:   '#hs-form-target',

        // Disable HubSpot's built-in CSS so we apply our own (see index.css)
        cssRequired: '',

        onFormReady($form) {
          if (!mounted) return
          setFormReady(true)

          // ── Pre-fill hidden fields with audit context ──────────────────
          // content_audit_pdf_url starts empty; it is updated later via
          // PATCH from /api/pdf once the user generates the PDF report.
          const hiddenFields = {
            content_audit_pdf_url: '',
            content_audit_score:   String(auditData.overallScore ?? ''),
            content_audit_url:     auditData.url ?? '',
            content_audit_date:    new Date().toISOString().split('T')[0],
          }
          Object.entries(hiddenFields).forEach(([name, value]) => {
            $form
              .find(`input[name="${name}"]`)
              .val(value)
              .trigger('change')
          })
        },

        onFormSubmit($form) {
          // Capture visible field values before HubSpot posts to its API
          capturedRef.current = {
            firstName: $form.find('input[name="firstname"]').val()  || '',
            email:     $form.find('input[name="email"]').val()       || '',
            phone:     $form.find('input[name="phone"]').val()       || '',
          }
        },

        onFormSubmitted() {
          if (!mounted) return
          // Advance the app to the results step
          onSubmit(capturedRef.current)
        },
      })
    }

    if (window.hbspt) {
      initForm()
    } else {
      const script = document.createElement('script')
      script.src     = 'https://js.hsforms.net/forms/embed/v2.js'
      script.charset = 'utf-8'
      script.async   = true
      script.onload  = initForm
      document.head.appendChild(script)
    }

    return () => { mounted = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-6 py-16">

      {/* ── Header ── */}
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

        {/* ── Score preview ── */}
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
              {Object.entries(auditData.categoryScores || {}).map(([label, val]) => (
                <CategoryBar key={label} label={label} score={val} />
              ))}
            </div>

            {/* Blurred issue teaser */}
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

        {/* ── HubSpot embedded form ── */}
        <div className="fade-up fade-up-2">
          <div className="bg-white border border-accent/30 rounded-2xl p-6 shadow-sm">
            <div className="mb-5">
              <h3 className="font-display text-xl font-700 text-text-primary mb-2">
                Zobrazte kompletní výsledky
              </h3>
              <p className="text-text-secondary text-sm">
                Dostanete plný report s konkrétními doporučeními jak zlepšit obsah a zvýšit konverze.
              </p>
            </div>

            {/* Loading skeleton shown until HubSpot renders the form */}
            {!formReady && (
              <div className="space-y-4 animate-pulse">
                {[1, 2, 3].map(i => (
                  <div key={i}>
                    <div className="h-3 w-16 bg-surface rounded mb-2" />
                    <div className="h-11 bg-surface rounded-lg border border-border" />
                  </div>
                ))}
                <div className="h-12 bg-accent/10 rounded-lg" />
              </div>
            )}

            {/* HubSpot form mount point */}
            <div id="hs-form-target" className={formReady ? '' : 'hidden'} />

            <p className="text-center text-xs text-muted mt-4">
              Vaše data jsou v bezpečí. Neposíláme spam.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
