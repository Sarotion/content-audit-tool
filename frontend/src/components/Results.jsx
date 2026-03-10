import { useState, useRef } from 'react'
import ScoreRing from './ScoreRing'

const PRIORITY_COLORS = {
  'vysoká': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100' },
  'střední': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
  'nízká':   { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100' }
}

function IssueItem({ text, type = 'issue' }) {
  const isIssue = type === 'issue'
  return (
    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
      isIssue
        ? 'bg-red-50 border-red-200 text-text-secondary'
        : 'bg-green-50 border-green-200 text-text-secondary'
    }`}>
      <span className={`shrink-0 mt-0.5 ${isIssue ? 'text-red-500' : 'text-green-600'}`}>
        {isIssue ? '⚠' : '✓'}
      </span>
      <span>{text}</span>
    </div>
  )
}

function CheckSection({ title, check, icon }) {
  if (!check) return null
  const scoreColor = check.score >= 71 ? '#22c55e' : check.score >= 41 ? '#F5D127' : '#ef4444'
  return (
    <div className="bg-white border border-border rounded-xl p-4 audit-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-body font-500 text-text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-16 bg-surface rounded-full overflow-hidden border border-border">
            <div className="h-full rounded-full" style={{ width: `${check.score}%`, backgroundColor: scoreColor }} />
          </div>
          <span className="text-xs font-mono" style={{ color: scoreColor }}>{check.score}</span>
        </div>
      </div>
      {check.value && <p className="text-xs font-mono text-muted mb-3 truncate">{check.value}</p>}
      <div className="space-y-1.5">
        {(check.issues || []).map((issue, i) => <IssueItem key={i} text={issue} type="issue" />)}
        {(check.passed || []).slice(0, 2).map((p, i) => <IssueItem key={i} text={p} type="pass" />)}
      </div>
    </div>
  )
}

function AICard({ title, data, icon }) {
  if (!data) return null
  const scoreColor = data.score >= 71 ? '#22c55e' : data.score >= 41 ? '#F5D127' : '#ef4444'
  return (
    <div className="bg-white border border-border rounded-xl p-4 audit-card">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-500 text-text-primary">{title}</span>
        </div>
        <span className="text-sm font-mono font-700" style={{ color: scoreColor }}>{data.score}/100</span>
      </div>
      {data.tone && (
        <span className="inline-block text-xs font-mono bg-surface border border-border rounded-full px-2 py-0.5 mb-2 text-muted">
          {data.tone}
        </span>
      )}
      <p className="text-xs text-text-secondary mb-3">{data.summary}</p>
      <div className="space-y-1.5">
        {(data.issues || []).map((issue, i) => <IssueItem key={i} text={issue} type="issue" />)}
        {(data.passed || []).slice(0, 1).map((p, i) => <IssueItem key={i} text={p} type="pass" />)}
      </div>
    </div>
  )
}

function PageDetail({ page }) {
  const [open, setOpen] = useState(false)
  const typeLabels = { product: 'Produkt', category: 'Kategorie', homepage: 'Homepage', blog: 'Blog', other: 'Ostatní' }

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-surface transition-colors text-left"
      >
        <span className="w-10 h-10 flex items-center justify-center rounded-lg bg-surface shrink-0">
          <ScoreRing score={page.score} size={36} strokeWidth={4} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-mono text-muted truncate">{page.url}</div>
          <div className="text-xs text-text-secondary mt-0.5">
            {typeLabels[page.type] || page.type} · {page.wordCount} slov
          </div>
        </div>
        <span className="text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-border bg-surface space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {page.checks && Object.entries({
              'Title': [page.checks.title, '📌'],
              'Meta desc.': [page.checks.metaDescription, '📝'],
              'Nadpisy': [page.checks.headings, '🔤'],
              'Obsah': [page.checks.thinContent, '📄'],
              'Obrázky': [page.checks.images, '🖼'],
              'Schema': [page.checks.structuredData, '🔗'],
              'OpenGraph': [page.checks.openGraph, '📣'],
              'URL': [page.checks.url, '🌐']
            }).map(([label, [check, icon]]) => check ? (
              <div key={label} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-border">
                <span className="text-xs text-muted">{icon} {label}</span>
                <span className="text-xs font-mono" style={{
                  color: check.score >= 71 ? '#22c55e' : check.score >= 41 ? '#F5D127' : '#ef4444'
                }}>{check.score}</span>
              </div>
            ) : null)}
          </div>
          {page.aiAnalysis && (
            <div className="grid grid-cols-1 gap-2">
              <AICard title="První dojem" data={page.aiAnalysis.firstImpression} icon="👁" />
              <AICard title="Benefit gap" data={page.aiAnalysis.benefitGap} icon="🎯" />
              <AICard title="Emoční tón" data={page.aiAnalysis.emotionalTone} icon="💬" />
              <AICard title="Kvalita obsahu" data={page.aiAnalysis.contentQuality} icon="✍️" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PDF Template (rendered off-screen, captured by html2pdf) ──────────────

function PdfTemplate({ auditData, pdfRef }) {
  const score = auditData.overallScore
  const scoreColor = score >= 71 ? '#22c55e' : score >= 41 ? '#F5D127' : '#ef4444'
  const scoreLabel = score >= 71 ? 'Dobrý základ' : score >= 41 ? 'Potřebuje práci' : 'Kritický stav'
  const date = new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })

  const s = {
    page: {
      fontFamily: "'DM Sans', Arial, sans-serif",
      width: '794px',
      minHeight: '1123px',
      background: '#ffffff',
      color: '#14143C',
      fontSize: '13px',
      lineHeight: '1.55',
      padding: '44px 48px',
      boxSizing: 'border-box',
    },
    // Header
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingBottom: '20px', marginBottom: '28px',
      borderBottom: '2px solid #B72C6A',
    },
    logo: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoBox: {
      width: '34px', height: '34px', background: '#B72C6A', borderRadius: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    logoText: { fontWeight: '700', fontSize: '18px', color: '#14143C' },
    logoAccent: { color: '#B72C6A' },
    headerRight: { textAlign: 'right', color: '#83839C', fontSize: '11.5px' },

    // Score hero
    scoreBox: {
      display: 'flex', alignItems: 'center', gap: '24px',
      background: '#F9EDF3', border: '1px solid rgba(183,44,106,0.2)',
      borderRadius: '12px', padding: '20px 24px', marginBottom: '24px',
    },
    scoreCircle: {
      width: '80px', height: '80px', border: `5px solid ${scoreColor}`,
      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    scoreNum: { fontSize: '26px', fontWeight: '700', color: scoreColor, fontFamily: 'monospace' },
    scoreInfo: { flex: 1 },
    scoreLabel: { fontSize: '20px', fontWeight: '700', color: scoreColor, marginBottom: '4px' },
    scoreMeta: { fontSize: '12px', color: '#83839C' },

    // Summary
    summaryBox: {
      background: '#F9EDF3', border: '1px solid rgba(183,44,106,0.2)',
      borderRadius: '10px', padding: '14px 16px', marginBottom: '24px',
    },
    summaryLabel: { fontSize: '10px', fontWeight: '600', color: '#B72C6A', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' },
    summaryText: { fontSize: '12.5px', color: '#4A4A6A', lineHeight: '1.6' },

    // Section
    sectionTitle: {
      fontSize: '10px', fontWeight: '700', color: '#83839C',
      letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: '12px', marginTop: '0',
    },
    section: { marginBottom: '24px' },

    // Category bars
    catRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '9px' },
    catLabel: { width: '150px', fontSize: '12.5px', color: '#4A4A6A', flexShrink: 0 },
    catBarBg: { flex: 1, height: '7px', background: '#E9E9F9', borderRadius: '4px', overflow: 'hidden' },
    catScore: { width: '28px', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace', fontWeight: '600', flexShrink: 0 },

    // Issues
    issueRow: {
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      background: '#FEF2F2', border: '1px solid #FECACA',
      borderRadius: '6px', padding: '8px 10px', marginBottom: '6px',
      fontSize: '12px', color: '#374151',
    },
    passRow: {
      display: 'flex', alignItems: 'flex-start', gap: '8px',
      background: '#F0FDF4', border: '1px solid #BBF7D0',
      borderRadius: '6px', padding: '8px 10px', marginBottom: '6px',
      fontSize: '12px', color: '#374151',
    },

    // Recommendations
    recCard: {
      border: '1px solid #E9E9F9', borderRadius: '8px',
      padding: '12px 14px', marginBottom: '10px', background: '#FAFAFA',
    },
    recHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
    recNum: { fontSize: '18px', fontWeight: '700', color: '#B72C6A', fontFamily: 'monospace', minWidth: '28px' },

    // Priority badges
    badgeHigh:   { background: '#FEE2E2', color: '#DC2626', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.07em', textTransform: 'uppercase' },
    badgeMid:    { background: '#FEF9C3', color: '#A16207', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.07em', textTransform: 'uppercase' },
    badgeLow:    { background: '#DBEAFE', color: '#1D4ED8', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', letterSpacing: '0.07em', textTransform: 'uppercase' },

    recAction: { fontSize: '12.5px', color: '#14143C', fontWeight: '500', flex: 1 },
    recImpact: { fontSize: '11.5px', color: '#83839C', marginTop: '4px' },

    // Footer
    footer: {
      borderTop: '1px solid #E9E9F9', paddingTop: '14px', marginTop: '32px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    footerLeft: { fontSize: '11px', color: '#83839C' },
    footerRight: { fontSize: '11px', color: '#B72C6A', fontWeight: '600' },

    divider: { borderTop: '1px solid #E9E9F9', margin: '20px 0' },
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  }

  function getCatColor(v) {
    return v >= 71 ? '#22c55e' : v >= 41 ? '#F5D127' : '#ef4444'
  }
  function getPriorityBadge(p) {
    const key = (p || '').toLowerCase()
    if (key === 'vysoká') return s.badgeHigh
    if (key === 'střední') return s.badgeMid
    return s.badgeLow
  }

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none' }} aria-hidden="true">
      <div ref={pdfRef} style={s.page}>

        {/* ── Header ── */}
        <div style={s.header}>
          <div>
            <div style={s.logo}>
              <div style={s.logoBox}>
                <span style={{ color: '#fff', fontWeight: '800', fontSize: '17px' }}>G</span>
              </div>
              <span style={s.logoText}>
                Get<span style={s.logoAccent}>Found</span>
                <span style={{ fontWeight: '400', color: '#83839C', fontSize: '14px', marginLeft: '6px' }}>
                  Content Audit Report
                </span>
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#83839C', marginTop: '4px', marginLeft: '44px' }}>
              Automatizovaný audit obsahu e-shopu
            </div>
          </div>
          <div style={s.headerRight}>
            <div style={{ fontWeight: '600', color: '#14143C', marginBottom: '2px' }}>{date}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>{auditData.url}</div>
          </div>
        </div>

        {/* ── Score hero ── */}
        <div style={s.scoreBox}>
          <div style={s.scoreCircle}>
            <span style={s.scoreNum}>{score}</span>
          </div>
          <div style={s.scoreInfo}>
            <div style={s.scoreLabel}>{scoreLabel}</div>
            <div style={s.scoreMeta}>
              Celkové skóre: <strong style={{ color: scoreColor }}>{score}/100</strong>
              &nbsp;·&nbsp;{auditData.pagesAnalyzed} stránek auditováno
              &nbsp;·&nbsp;{auditData.brokenLinksCount} broken {auditData.brokenLinksCount === 1 ? 'link' : 'linků'}
              {((auditData.duplicateTitles?.length || 0) + (auditData.duplicateDescriptions?.length || 0)) > 0 && (
                <>&nbsp;·&nbsp;{(auditData.duplicateTitles?.length || 0) + (auditData.duplicateDescriptions?.length || 0)} duplicit</>
              )}
            </div>
          </div>
        </div>

        {/* ── AI summary ── */}
        {auditData.overallSummary && (
          <div style={s.summaryBox}>
            <div style={s.summaryLabel}>✦ AI shrnutí</div>
            <div style={s.summaryText}>{auditData.overallSummary}</div>
          </div>
        )}

        {/* ── Category scores ── */}
        <div style={s.section}>
          <div style={s.sectionTitle}>Skóre po oblastech</div>
          {Object.entries(auditData.categoryScores || {}).map(([label, val]) => {
            const c = getCatColor(val)
            return (
              <div key={label} style={s.catRow}>
                <div style={s.catLabel}>{label}</div>
                <div style={s.catBarBg}>
                  <div style={{ height: '100%', width: `${val}%`, background: c, borderRadius: '4px' }} />
                </div>
                <div style={{ ...s.catScore, color: c }}>{val}</div>
              </div>
            )
          })}
        </div>

        <div style={s.divider} />

        {/* ── Two-column: issues + strengths ── */}
        <div style={s.twoCol}>
          {/* Main issues */}
          {auditData.topIssues?.length > 0 && (
            <div>
              <div style={s.sectionTitle}>Hlavní problémy</div>
              {auditData.topIssues.map((issue, i) => (
                <div key={i} style={s.issueRow}>
                  <span style={{ color: '#EF4444', flexShrink: 0, marginTop: '1px' }}>⚠</span>
                  <span>{issue}</span>
                </div>
              ))}
            </div>
          )}

          {/* Strengths */}
          {auditData.topStrengths?.length > 0 && (
            <div>
              <div style={s.sectionTitle}>Silné stránky</div>
              {auditData.topStrengths.map((str, i) => (
                <div key={i} style={s.passRow}>
                  <span style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }}>✓</span>
                  <span>{str}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={s.divider} />

        {/* ── Recommendations ── */}
        {auditData.topRecommendations?.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Top doporučení</div>
            {auditData.topRecommendations.map((rec, i) => (
              <div key={i} style={s.recCard}>
                <div style={s.recHeader}>
                  <span style={{ ...s.recNum }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={getPriorityBadge(rec.priority)}>
                    {(rec.priority || 'nízká').toUpperCase()} PRIORITA
                  </span>
                  <span style={s.recAction}>{rec.action}</span>
                </div>
                {rec.impact && (
                  <div style={s.recImpact}>Dopad: {rec.impact}</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Broken links (if any) ── */}
        {auditData.brokenLinks?.length > 0 && (
          <>
            <div style={s.divider} />
            <div style={s.section}>
              <div style={s.sectionTitle}>Broken linky ({auditData.brokenLinks.length})</div>
              {auditData.brokenLinks.slice(0, 5).map((link, i) => (
                <div key={i} style={{ ...s.issueRow, fontFamily: 'monospace', fontSize: '11px' }}>
                  <span style={{ color: '#EF4444', flexShrink: 0 }}>404</span>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link}</span>
                </div>
              ))}
              {auditData.brokenLinks.length > 5 && (
                <div style={{ fontSize: '11px', color: '#83839C', marginTop: '4px' }}>
                  + {auditData.brokenLinks.length - 5} dalších broken linků
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Footer ── */}
        <div style={s.footer}>
          <div style={s.footerLeft}>
            Vygenerováno nástrojem GetFound Content Audit Tool · audit.getfound.cz
          </div>
          <div style={s.footerRight}>getfound.cz</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Results component ────────────────────────────────────────────────

export default function Results({ auditData, onRestart, contact }) {
  const [tab, setTab] = useState('overview')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfStatus, setPdfStatus] = useState(null) // null | 'ok' | 'error'
  const [pdfUrl, setPdfUrl] = useState(null)
  const pdfRef = useRef(null)

  const score = auditData.overallScore
  const scoreColor = score >= 71 ? '#22c55e' : score >= 41 ? '#F5D127' : '#ef4444'
  const scoreLabel = score >= 71 ? 'Dobrý základ' : score >= 41 ? 'Potřebuje práci' : 'Kritický stav'

  const tabs = [
    { id: 'overview', label: 'Přehled' },
    { id: 'pages', label: `Stránky (${auditData.pages?.length || 0})` },
    { id: 'recommendations', label: 'Doporučení' }
  ]

  async function generatePdf() {
    if (pdfLoading || !pdfRef.current) return
    setPdfLoading(true)
    setPdfStatus(null)

    try {
      const html2pdf = (await import('html2pdf.js')).default

      const domain = (() => {
        try { return new URL(auditData.url).hostname.replace(/^www\./, '') }
        catch { return 'audit' }
      })()
      const filename = `content-audit-${domain}.pdf`

      const opt = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          backgroundColor: '#ffffff',
        },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      }

      const worker = html2pdf().set(opt).from(pdfRef.current)

      // Get data URI (base64) – this also triggers the download
      const dataUri = await worker.outputPdf('datauristring')

      // Trigger browser download
      const a = document.createElement('a')
      a.href = dataUri
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      // Extract base64 and send to backend
      const base64 = dataUri.split(',')[1]
      const apiUrl = import.meta.env.VITE_API_URL

      const resp = await fetch(`${apiUrl}/api/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: base64,
          contactEmail: contact?.email || null,
          auditUrl: auditData.url,
        }),
      })

      if (resp.ok) {
        const data = await resp.json()
        setPdfUrl(data.url || null)
        setPdfStatus('ok')
      } else {
        setPdfStatus('ok') // download already worked; backend save is non-critical
      }
    } catch (err) {
      console.error('PDF generation failed:', err)
      setPdfStatus('error')
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">

      {/* Hidden PDF template rendered off-screen */}
      <PdfTemplate auditData={auditData} pdfRef={pdfRef} />

      {/* Header */}
      <div className="flex items-start justify-between mb-10 fade-up">
        <div>
          <div className="inline-flex items-center gap-2 bg-white border border-border rounded-full px-4 py-1.5 mb-4 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreColor }} />
            <span className="text-xs font-mono text-muted uppercase tracking-widest">{scoreLabel}</span>
          </div>
          <h2 className="font-display text-3xl font-700 text-text-primary mb-1">
            Výsledky auditu
          </h2>
          <p className="text-muted font-mono text-sm">{auditData.url}</p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* PDF button */}
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={generatePdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 bg-white border border-border rounded-lg px-4 py-2 text-xs font-mono
                text-text-secondary hover:border-accent hover:text-accent transition-colors shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? (
                <>
                  <svg className="animate-spin w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.49 8.49l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.49-8.49l2.83-2.83" />
                  </svg>
                  Generuji PDF...
                </>
              ) : (
                <>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3" />
                  </svg>
                  Stáhnout PDF report
                </>
              )}
            </button>
            {pdfStatus === 'ok' && (
              <span className="text-xs text-green-600 font-mono">
                ✓ PDF staženo
                {pdfUrl && <> · <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-accent">odkaz</a></>}
              </span>
            )}
            {pdfStatus === 'error' && (
              <span className="text-xs text-red-500 font-mono">Generování selhalo, zkuste znovu</span>
            )}
          </div>

          <button
            onClick={onRestart}
            className="text-xs font-mono text-muted border border-border rounded-lg px-4 py-2 hover:border-accent hover:text-accent transition-colors bg-white"
          >
            ← Nový audit
          </button>
        </div>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 fade-up fade-up-1">
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
          <ScoreRing score={score} size={56} strokeWidth={5} />
          <div>
            <div className="text-xs text-muted">Celkové skóre</div>
            <div className="font-display text-lg font-700" style={{ color: scoreColor }}>{scoreLabel}</div>
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-display font-700 text-text-primary">{auditData.pagesAnalyzed}</div>
          <div className="text-xs text-muted mt-1">stránek auditováno</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-display font-700 text-red-500">{auditData.brokenLinksCount}</div>
          <div className="text-xs text-muted mt-1">broken linků</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-display font-700 text-yellow-600">
            {(auditData.duplicateTitles?.length || 0) + (auditData.duplicateDescriptions?.length || 0)}
          </div>
          <div className="text-xs text-muted mt-1">duplicit nalezeno</div>
        </div>
      </div>

      {/* Summary */}
      {auditData.overallSummary && (
        <div className="bg-accent-light border border-accent/20 rounded-xl p-5 mb-8 fade-up fade-up-2">
          <div className="flex items-start gap-3">
            <span className="text-accent text-lg mt-0.5">✦</span>
            <div>
              <div className="text-xs font-mono text-accent mb-1 uppercase tracking-wide">AI shrnutí</div>
              <p className="text-text-secondary text-sm leading-relaxed">{auditData.overallSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-body transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-text-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Skóre po oblastech</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(auditData.categoryScores || {}).map(([label, val]) => {
                const c = val >= 71 ? '#22c55e' : val >= 41 ? '#F5D127' : '#ef4444'
                return (
                  <div key={label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="text-2xl font-display font-700 shrink-0 w-12" style={{ color: c }}>{val}</div>
                    <div className="flex-1">
                      <div className="text-sm text-text-primary mb-1.5">{label}</div>
                      <div className="h-1 bg-surface rounded-full overflow-hidden border border-border">
                        <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: c }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {auditData.topIssues?.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Hlavní problémy</h3>
              <div className="space-y-2">
                {auditData.topIssues.map((issue, i) => (
                  <IssueItem key={i} text={issue} type="issue" />
                ))}
              </div>
            </div>
          )}

          {auditData.topStrengths?.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Silné stránky</h3>
              <div className="space-y-2">
                {auditData.topStrengths.map((s, i) => (
                  <IssueItem key={i} text={s} type="pass" />
                ))}
              </div>
            </div>
          )}

          {auditData.brokenLinks?.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Broken linky</h3>
              <div className="space-y-1">
                {auditData.brokenLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-red-200 rounded-lg px-3 py-2">
                    <span className="text-red-500 text-xs font-mono font-600">404</span>
                    <span className="text-xs font-mono text-muted truncate">{link}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Pages */}
      {tab === 'pages' && (
        <div className="space-y-3">
          {(auditData.pages || []).map((page, i) => (
            <PageDetail key={i} page={page} />
          ))}
        </div>
      )}

      {/* Tab: Recommendations */}
      {tab === 'recommendations' && (
        <div className="space-y-4">
          {(auditData.topRecommendations || []).map((rec, i) => {
            const p = rec.priority?.toLowerCase() || 'nízká'
            const styles = PRIORITY_COLORS[p] || PRIORITY_COLORS['nízká']
            return (
              <div key={i} className={`rounded-xl border p-5 ${styles.bg} ${styles.border}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${styles.badge} ${styles.text}`}>
                        {rec.priority?.toUpperCase() || 'NÍZKÁ'} PRIORITA
                      </span>
                    </div>
                    <p className="text-text-primary text-sm font-body">{rec.action}</p>
                    {rec.impact && (
                      <p className="text-text-secondary text-xs mt-2">
                        <span className="text-muted">Očekávaný dopad: </span>{rec.impact}
                      </p>
                    )}
                  </div>
                  <span className={`text-2xl font-display font-700 ${styles.text}`}>{String(i + 1).padStart(2, '0')}</span>
                </div>
              </div>
            )
          })}

          {auditData.siteWideIssues?.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Problémy celého webu</h3>
              <div className="space-y-2">
                {auditData.siteWideIssues.map((issue, i) => (
                  <IssueItem key={i} text={issue} type="issue" />
                ))}
              </div>
            </div>
          )}

          {auditData.keywordCannibalization?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Keyword kanibalizace</h3>
              {auditData.keywordCannibalization.map((item, i) => (
                <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-2">
                  <div className="text-sm font-mono text-yellow-700 mb-2">"{item.keyword}"</div>
                  <div className="space-y-1">
                    {(item.urls || []).map((url, j) => (
                      <div key={j} className="text-xs font-mono text-muted truncate">→ {url}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 bg-accent-light border border-accent/20 rounded-2xl p-8 text-center fade-up">
        <div className="text-accent font-mono text-xs uppercase tracking-widest mb-3">Chcete to napravit?</div>
        <h3 className="font-display text-2xl font-700 text-text-primary mb-3">
          Pomůžeme vám s obsahem
        </h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
          Náš tým se specializuje na content strategii a SEO copywriting pro e-shopy.
          Ozveme se vám s konkrétním návrhem.
        </p>
        <a
          href="mailto:info@getfound.cz"
          className="inline-flex items-center gap-2 bg-accent text-white font-display font-700 rounded-lg px-8 py-3 hover:bg-accent-hover transition-colors"
        >
          Domluvit konzultaci →
        </a>
      </div>
    </div>
  )
}
