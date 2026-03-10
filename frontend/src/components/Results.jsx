import { useState, useRef } from 'react'
import ScoreRing from './ScoreRing'

const PRIORITY_COLORS = {
  'vysoká': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100' },
  'střední': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
  'nízká':   { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100' }
}

// ─── Priority matrix helpers ────────────────────────────────────────────────

function getRecCategory(rec) {
  const e = rec.ease || 2
  const imp = rec.impact || 2
  if (e === 1 && imp === 3) return 0           // 🟢 Udělej hned
  if ((e === 1 && imp === 2) || (e === 2 && imp === 3)) return 1  // 🟡 Naplánuj
  return 2                                     // ⚪ Až budeš mít čas
}

const CATEGORY_INFO = [
  { emoji: '🟢', label: 'Udělej hned',       color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  { emoji: '🟡', label: 'Naplánuj',           color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { emoji: '⚪', label: 'Až budeš mít čas',  color: 'text-muted',      bg: 'bg-gray-50',   border: 'border-gray-200' },
]

function DotIndicator({ value, max = 3, colorFilled = '#1B6840' }) {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <svg key={i} width="8" height="8" viewBox="0 0 8 8">
          <circle cx="4" cy="4" r="3.5" fill={i < value ? colorFilled : '#E5E7EB'} />
        </svg>
      ))}
    </span>
  )
}

function PriorityMatrix({ recommendations }) {
  const recs = recommendations.filter(r => r.ease != null && r.impact != null)
  if (recs.length === 0) return null

  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm mb-6">
      <h3 className="text-sm font-700 text-text-primary mb-0.5">Prioritizační matice</h3>
      <p className="text-xs text-muted mb-5">
        Osa X = snadnost provedení &nbsp;·&nbsp; Osa Y = dopad na výsledky · Najeďte myší na číslo pro detail
      </p>

      <div className="flex gap-3">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-between py-1 shrink-0" style={{ width: '18px' }}>
          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '10px', color: '#9CA3AF', lineHeight: 1 }}>Velký</span>
          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '10px', color: '#6B7280', fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}>DOPAD ↑</span>
          <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '10px', color: '#9CA3AF', lineHeight: 1 }}>Malý</span>
        </div>

        <div className="flex-1 flex flex-col gap-2">
          {/* Matrix grid */}
          <div className="relative rounded-xl overflow-hidden border border-border" style={{ height: '220px' }}>
            {/* 2×2 quadrant backgrounds */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              <div style={{ background: '#F0FDF4' }} />   {/* top-left:  easy + high impact → green */}
              <div style={{ background: '#FEFCE8' }} />   {/* top-right: hard + high impact → yellow */}
              <div style={{ background: '#EFF6FF' }} />   {/* bot-left:  easy + low  impact → blue  */}
              <div style={{ background: '#F9FAFB' }} />   {/* bot-right: hard + low  impact → gray  */}
            </div>

            {/* Center dividers */}
            <div className="absolute pointer-events-none" style={{ left: '50%', top: 0, bottom: 0, width: '1px', background: '#D1D5DB' }} />
            <div className="absolute pointer-events-none" style={{ top: '50%', left: 0, right: 0, height: '1px', background: '#D1D5DB' }} />

            {/* Quadrant corner labels */}
            <div className="absolute top-2 left-3 text-xs font-600 pointer-events-none" style={{ color: '#15803d', fontSize: '11px' }}>🟢 Udělej hned</div>
            <div className="absolute top-2 right-3 text-xs font-600 pointer-events-none text-right" style={{ color: '#a16207', fontSize: '11px' }}>🟡 Naplánuj</div>
            <div className="absolute bottom-2 left-3 text-xs font-600 pointer-events-none" style={{ color: '#1d4ed8', fontSize: '11px' }}>🟡 Naplánuj</div>
            <div className="absolute bottom-2 right-3 text-xs font-600 pointer-events-none text-right" style={{ color: '#9CA3AF', fontSize: '11px' }}>⚪ Později</div>

            {/* Dots */}
            {recs.map((rec, i) => {
              // ease 1→12%, 2→50%, 3→88% on X; impact 3→12%, 2→50%, 1→88% on Y
              const xPct = ((rec.ease - 1) / 2) * 76 + 12
              const yPct = ((3 - rec.impact) / 2) * 76 + 12
              return (
                <div
                  key={i}
                  className="absolute group z-10"
                  style={{ left: `${xPct}%`, top: `${yPct}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full text-white text-sm font-700 flex items-center justify-center cursor-default select-none border-2 border-white shadow-md"
                    style={{ background: '#1B6840' }}
                  >
                    {i + 1}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-56 bg-gray-900 text-white text-xs rounded-xl p-3 hidden group-hover:block z-20 leading-relaxed shadow-2xl pointer-events-none">
                    <div className="font-600 mb-1.5">{rec.action}</div>
                    <div style={{ color: '#9CA3AF' }}>
                      Snadnost: {rec.ease}/3 &nbsp;·&nbsp; Dopad: {rec.impact}/3
                    </div>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-muted px-1">
            <span>← Snadné</span>
            <span className="font-700 text-text-secondary">SNADNOST →</span>
            <span>Složité →</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function scoreColor(v) {
  return v >= 70 ? '#22c55e' : v >= 50 ? '#F59E0B' : '#ef4444'
}
function scoreLabel(v) {
  return v >= 70 ? 'Dobrý základ' : v >= 50 ? 'Potřebuje práci' : 'Kritický stav'
}

function IssueItem({ text, type = 'issue' }) {
  const isIssue = type === 'issue'
  return (
    <li className="flex items-start gap-2 text-sm">
      <span className={`shrink-0 mt-0.5 ${isIssue ? 'text-orange-500' : 'text-green-600'}`}>
        {isIssue ? (
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm1 15h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
        ) : (
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
        )}
      </span>
      <span className="text-text-secondary">{text}</span>
    </li>
  )
}

function PageDetail({ page }) {
  const [open, setOpen] = useState(false)
  const typeLabels = { product: 'Produkt', category: 'Kategorie', homepage: 'Homepage', blog: 'Blog', other: 'Ostatní' }
  const c = scoreColor(page.score)

  return (
    <div className="border border-border rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-surface transition-colors text-left"
      >
        <ScoreRing score={page.score} size={36} strokeWidth={4} />
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
              'Title': page.checks.title,
              'Meta desc.': page.checks.metaDescription,
              'Nadpisy': page.checks.headings,
              'Obsah': page.checks.thinContent,
              'Obrázky': page.checks.images,
              'Schema': page.checks.structuredData,
              'OpenGraph': page.checks.openGraph,
              'URL': page.checks.url
            }).map(([label, check]) => check ? (
              <div key={label} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-border">
                <span className="text-xs text-muted">{label}</span>
                <span className="text-xs font-mono font-600" style={{ color: scoreColor(check.score) }}>{check.score}</span>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Off-screen PDF template ───────────────────────────────────────────────
function PdfTemplate({ auditData, pdfRef }) {
  const score = auditData.overallScore
  const sc = scoreColor(score)
  const sl = scoreLabel(score)
  const date = new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })

  const s = {
    page: { fontFamily: "'DM Sans', Arial, sans-serif", width: '794px', minHeight: '1123px', background: '#fff', color: '#111827', fontSize: '13px', lineHeight: '1.55', padding: '44px 48px', boxSizing: 'border-box' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '20px', marginBottom: '28px', borderBottom: '2px solid #1B6840' },
    logo: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoBox: { width: '34px', height: '34px', background: '#1B6840', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    logoText: { fontWeight: '700', fontSize: '18px', color: '#111827' },
    headerRight: { textAlign: 'right', color: '#9CA3AF', fontSize: '11.5px' },
    scoreBox: { display: 'flex', alignItems: 'center', gap: '24px', background: '#ECFDF5', border: '1px solid rgba(27,104,64,0.2)', borderRadius: '12px', padding: '20px 24px', marginBottom: '24px' },
    scoreCircle: { width: '80px', height: '80px', border: `5px solid ${sc}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    scoreNum: { fontSize: '26px', fontWeight: '700', color: sc, fontFamily: 'monospace' },
    summaryBox: { background: '#ECFDF5', border: '1px solid rgba(27,104,64,0.2)', borderRadius: '10px', padding: '14px 16px', marginBottom: '24px' },
    summaryLabel: { fontSize: '10px', fontWeight: '600', color: '#1B6840', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '5px' },
    sectionTitle: { fontSize: '10px', fontWeight: '700', color: '#9CA3AF', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' },
    section: { marginBottom: '24px' },
    catRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '9px' },
    catLabel: { width: '150px', fontSize: '12.5px', color: '#6B7280', flexShrink: 0 },
    catBarBg: { flex: 1, height: '7px', background: '#E5E7EB', borderRadius: '4px', overflow: 'hidden' },
    catScore: { width: '28px', textAlign: 'right', fontSize: '12px', fontFamily: 'monospace', fontWeight: '600', flexShrink: 0 },
    issueRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px', fontSize: '12px', color: '#374151' },
    passRow: { display: 'flex', alignItems: 'flex-start', gap: '8px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '6px', padding: '8px 10px', marginBottom: '6px', fontSize: '12px', color: '#374151' },
    recCard: { border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px 14px', marginBottom: '10px', background: '#FAFAFA' },
    recHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' },
    recNum: { fontSize: '18px', fontWeight: '700', color: '#1B6840', fontFamily: 'monospace', minWidth: '28px' },
    badgeHigh: { background: '#FEE2E2', color: '#DC2626', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase' },
    badgeMid:  { background: '#FEF9C3', color: '#A16207', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase' },
    badgeLow:  { background: '#DBEAFE', color: '#1D4ED8', fontSize: '9px', fontWeight: '700', padding: '2px 7px', borderRadius: '20px', textTransform: 'uppercase' },
    footer: { borderTop: '1px solid #E5E7EB', paddingTop: '14px', marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    divider: { borderTop: '1px solid #E5E7EB', margin: '20px 0' },
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  }

  function getPriorityBadge(p) {
    if ((p || '').toLowerCase() === 'vysoká') return s.badgeHigh
    if ((p || '').toLowerCase() === 'střední') return s.badgeMid
    return s.badgeLow
  }

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none' }} aria-hidden="true">
      <div ref={pdfRef} style={s.page}>
        <div style={s.header}>
          <div>
            <div style={s.logo}>
              <div style={s.logoBox}><span style={{ color: '#fff', fontWeight: '800', fontSize: '17px' }}>G</span></div>
              <span style={s.logoText}>Get<span style={{ color: '#1B6840' }}>Found</span> <span style={{ fontWeight: '400', color: '#9CA3AF', fontSize: '14px' }}>Content Audit Report</span></span>
            </div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px', marginLeft: '44px' }}>Automatizovaný audit obsahu e-shopu</div>
          </div>
          <div style={s.headerRight}>
            <div style={{ fontWeight: '600', color: '#111827', marginBottom: '2px' }}>{date}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>{auditData.url}</div>
          </div>
        </div>

        <div style={s.scoreBox}>
          <div style={s.scoreCircle}><span style={s.scoreNum}>{score}</span></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: sc, marginBottom: '4px' }}>{sl}</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
              Celkové skóre: <strong style={{ color: sc }}>{score}/100</strong>
              &nbsp;·&nbsp;{auditData.pagesAnalyzed} stránek auditováno
              &nbsp;·&nbsp;{auditData.brokenLinksCount} broken linků
            </div>
          </div>
        </div>

        {auditData.overallSummary && (
          <div style={s.summaryBox}>
            <div style={s.summaryLabel}>AI shrnutí</div>
            <div style={{ fontSize: '12.5px', color: '#6B7280', lineHeight: '1.6' }}>{auditData.overallSummary}</div>
          </div>
        )}

        <div style={s.section}>
          <div style={s.sectionTitle}>Skóre po oblastech</div>
          {Object.entries(auditData.categoryScores || {}).map(([label, val]) => {
            const c = scoreColor(val)
            return (
              <div key={label} style={s.catRow}>
                <div style={s.catLabel}>{label}</div>
                <div style={s.catBarBg}><div style={{ height: '100%', width: `${val}%`, background: c, borderRadius: '4px' }} /></div>
                <div style={{ ...s.catScore, color: c }}>{val}</div>
              </div>
            )
          })}
        </div>

        <div style={s.divider} />

        <div style={s.twoCol}>
          {auditData.topIssues?.length > 0 && (
            <div>
              <div style={s.sectionTitle}>Hlavní problémy</div>
              {auditData.topIssues.map((issue, i) => (
                <div key={i} style={s.issueRow}><span style={{ color: '#EF4444', flexShrink: 0 }}>⚠</span><span>{issue}</span></div>
              ))}
            </div>
          )}
          {auditData.topStrengths?.length > 0 && (
            <div>
              <div style={s.sectionTitle}>Silné stránky</div>
              {auditData.topStrengths.map((str, i) => (
                <div key={i} style={s.passRow}><span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span><span>{str}</span></div>
              ))}
            </div>
          )}
        </div>

        {auditData.topRecommendations?.length > 0 && (
          <>
            <div style={s.divider} />
            <div style={s.section}>
              <div style={s.sectionTitle}>Top doporučení</div>
              {auditData.topRecommendations.map((rec, i) => (
                <div key={i} style={s.recCard}>
                  <div style={s.recHeader}>
                    <span style={s.recNum}>{String(i + 1).padStart(2, '0')}</span>
                    <span style={getPriorityBadge(rec.priority)}>{(rec.priority || 'nízká').toUpperCase()} PRIORITA</span>
                    <span style={{ fontSize: '12.5px', color: '#111827', fontWeight: '500', flex: 1 }}>{rec.action}</span>
                  </div>
                  {(rec.impactDescription || (typeof rec.impact === 'string' ? rec.impact : '')) && (
                    <div style={{ fontSize: '11.5px', color: '#9CA3AF', marginTop: '4px' }}>
                      Dopad: {rec.impactDescription || rec.impact}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

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
            </div>
          </>
        )}

        <div style={s.footer}>
          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Vygenerováno nástrojem GetFound Content Audit Tool</div>
          <div style={{ fontSize: '11px', color: '#1B6840', fontWeight: '600' }}>getfound.cz</div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Results ──────────────────────────────────────────────────────────

export default function Results({ auditData, onRestart, contact }) {
  const [tab, setTab] = useState('overview')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfStatus, setPdfStatus] = useState(null)
  const [pdfUrl, setPdfUrl] = useState(null)
  const pdfRef = useRef(null)

  const score  = auditData.overallScore
  const sc     = scoreColor(score)
  const sl     = scoreLabel(score)
  const dupsCount = (auditData.duplicateTitles?.length || 0) + (auditData.duplicateDescriptions?.length || 0)

  const tabs = [
    { id: 'overview', label: 'Přehled' },
    { id: 'pages', label: `Stránky (${auditData.pages?.length || 0})` },
    { id: 'recommendations', label: 'Doporučení' }
  ]

  async function generatePdf() {
    if (pdfLoading || !pdfRef.current) return
    setPdfLoading(true); setPdfStatus(null)
    try {
      const html2pdf = (await import('html2pdf.js')).default
      const domain = (() => { try { return new URL(auditData.url).hostname.replace(/^www\./, '') } catch { return 'audit' } })()
      const filename = `content-audit-${domain}.pdf`
      const opt = {
        margin: 0, filename,
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#fff' },
        jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] },
      }
      const worker = html2pdf().set(opt).from(pdfRef.current)
      const dataUri = await worker.outputPdf('datauristring')
      const a = document.createElement('a'); a.href = dataUri; a.download = filename
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      const base64 = dataUri.split(',')[1]
      const apiUrl = import.meta.env.VITE_API_URL
      const resp = await fetch(`${apiUrl}/api/pdf`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdfBase64: base64, contactEmail: contact?.email || null, auditUrl: auditData.url }),
      })
      if (resp.ok) { const d = await resp.json(); setPdfUrl(d.url || null) }
      setPdfStatus('ok')
    } catch (err) {
      console.error('PDF failed:', err); setPdfStatus('error')
    } finally { setPdfLoading(false) }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 pb-28">

      {/* Off-screen PDF template */}
      <PdfTemplate auditData={auditData} pdfRef={pdfRef} />

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 mb-8 fade-up">
        <div>
          {/* Status badge */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-600 mb-3"
            style={{ background: score >= 70 ? '#DCFCE7' : score >= 50 ? '#FEF3C7' : '#FEE2E2',
                     color: sc }}
          >
            {sl}
          </div>
          <h2 className="font-display text-3xl font-700 text-text-primary mb-1">Výsledky auditu</h2>
          <div className="inline-flex items-center bg-surface border border-border rounded-md px-2.5 py-1">
            <span className="font-mono text-sm text-accent">
              {auditData.url?.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-1">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={generatePdf}
              disabled={pdfLoading}
              className="flex items-center gap-2 bg-white border border-border rounded-lg px-4 py-2 text-xs font-mono
                text-text-secondary hover:border-accent hover:text-accent transition-colors shadow-sm
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pdfLoading ? (
                <><svg className="animate-spin w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.49 8.49l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.49-8.49l2.83-2.83" /></svg>Generuji PDF...</>
              ) : (
                <><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3"/></svg>Stáhnout PDF report</>
              )}
            </button>
            {pdfStatus === 'ok' && (
              <span className="text-xs text-green-600 font-mono">✓ PDF staženo{pdfUrl && <> · <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="underline">odkaz</a></>}</span>
            )}
            {pdfStatus === 'error' && <span className="text-xs text-red-500 font-mono">Generování selhalo</span>}
          </div>
          <button
            onClick={onRestart}
            className="text-xs font-mono text-muted border border-border rounded-lg px-4 py-2 hover:border-accent hover:text-accent transition-colors bg-white"
          >
            ← Nový audit
          </button>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 fade-up fade-up-1">
        {/* Score */}
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <ScoreRing score={score} size={52} strokeWidth={5} />
          <div>
            <div className="text-xs text-muted mb-0.5">Skóre webu</div>
            <div className="text-sm font-600" style={{ color: sc }}>{sl}</div>
          </div>
        </div>
        {/* Pages */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-display font-700 text-text-primary">{auditData.pagesAnalyzed}</div>
          <div className="text-xs text-muted mt-1">stránek auditováno</div>
        </div>
        {/* Broken links */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-700 text-red-500 uppercase tracking-wide mb-0.5">Broken linků</div>
          <div className="text-2xl font-display font-700 text-red-500">{auditData.brokenLinksCount}</div>
          <div className="text-xs text-red-400">chyby 404</div>
        </div>
        {/* Duplicit */}
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-700 text-yellow-600 uppercase tracking-wide mb-0.5">Duplicit</div>
          <div className="text-2xl font-display font-700 text-yellow-600">{dupsCount}</div>
          <div className="text-xs text-yellow-500">nalezeny</div>
        </div>
      </div>

      {/* ── AI summary ── */}
      {auditData.overallSummary && (
        <div className="bg-white border border-border rounded-xl p-5 mb-8 shadow-sm fade-up fade-up-2">
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">🤖</span>
            <div>
              <div className="text-xs font-mono text-muted uppercase tracking-wide mb-1.5">AI Shrnutí</div>
              <p className="text-text-secondary text-sm leading-relaxed">{auditData.overallSummary}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-0 border-b-2 border-border mb-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-600 font-body transition-colors border-b-2 -mb-0.5 ${
              tab === t.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-mid'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Přehled ── */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Category scores */}
          <div>
            <h3 className="font-display text-base font-700 text-text-primary mb-4 flex items-center gap-2">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
              Skóre po oblastech
            </h3>
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(auditData.categoryScores || {}).map(([label, val]) => {
                const c = scoreColor(val)
                return (
                  <div key={label} className="bg-white border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="text-2xl font-display font-700 shrink-0 w-12" style={{ color: c }}>{val}</div>
                    <div className="flex-1">
                      <div className="text-sm text-text-primary mb-2">{label}</div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: c }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Issues + Strengths two-column */}
          {(auditData.topIssues?.length > 0 || auditData.topStrengths?.length > 0) && (
            <div className="grid md:grid-cols-2 gap-6">
              {auditData.topIssues?.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-700 text-text-primary mb-4 flex items-center gap-2">
                    <svg width="15" height="15" fill="none" stroke="#F59E0B" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    Hlavní problémy
                  </h3>
                  <ul className="space-y-2.5">
                    {auditData.topIssues.map((issue, i) => <IssueItem key={i} text={issue} type="issue" />)}
                  </ul>
                </div>
              )}
              {auditData.topStrengths?.length > 0 && (
                <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="text-sm font-700 text-text-primary mb-4 flex items-center gap-2">
                    <svg width="15" height="15" fill="none" stroke="#22c55e" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    Silné stránky
                  </h3>
                  <ul className="space-y-2.5">
                    {auditData.topStrengths.map((s, i) => <IssueItem key={i} text={s} type="pass" />)}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Broken links */}
          {auditData.brokenLinks?.length > 0 && (
            <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-700 text-text-primary mb-4 flex items-center gap-2">
                <svg width="15" height="15" fill="none" stroke="#EF4444" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
                Broken linky (404 chyby)
              </h3>
              <div className="space-y-2">
                {auditData.brokenLinks.map((link, i) => {
                  const path = (() => { try { return new URL(link).pathname } catch { return link } })()
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="bg-red-500 text-white text-xs font-700 font-mono px-1.5 py-0.5 rounded shrink-0">404</span>
                        <span className="text-xs font-mono text-red-700 truncate">{path}</span>
                      </div>
                      <span className="text-xs text-muted shrink-0 whitespace-nowrap">Kde se nachází?</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Stránky ── */}
      {tab === 'pages' && (
        <div className="space-y-3">
          {(auditData.pages || []).map((page, i) => <PageDetail key={i} page={page} />)}
        </div>
      )}

      {/* ── Tab: Doporučení ── */}
      {tab === 'recommendations' && (() => {
        const recs = auditData.topRecommendations || []
        const hasMatrix = recs.some(r => r.ease != null && r.impact != null)

        // Sort: 🟢 first, then 🟡, then ⚪
        const sortedRecs = [...recs]
          .map((r, origIdx) => ({ ...r, origIdx }))
          .sort((a, b) => getRecCategory(a) - getRecCategory(b))

        return (
          <div className="space-y-4">
            {/* Priority matrix */}
            {hasMatrix && <PriorityMatrix recommendations={recs} />}

            {/* Sorted recommendations list */}
            {sortedRecs.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-mono text-muted uppercase tracking-wide">
                  {hasMatrix ? 'Doporučení dle priority' : 'Top doporučení'}
                </h3>
                {sortedRecs.map((rec) => {
                  const cat = getRecCategory(rec)
                  const catInfo = CATEGORY_INFO[cat]
                  // Support both old (impact as string) and new (impactDescription) schema
                  const impactText = rec.impactDescription || (typeof rec.impact === 'string' ? rec.impact : '')
                  const p = rec.priority?.toLowerCase() || 'nízká'
                  const prioStyles = PRIORITY_COLORS[p] || PRIORITY_COLORS['nízká']

                  return (
                    <div key={rec.origIdx} className={`rounded-xl border p-5 ${catInfo.bg} ${catInfo.border}`}>
                      <div className="flex items-start gap-3">
                        {/* Number badge */}
                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-700 text-white mt-0.5" style={{ background: '#1B6840' }}>
                          {rec.origIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          {/* Category + priority row */}
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`text-xs font-600 ${catInfo.color}`}>
                              {catInfo.emoji} {catInfo.label}
                            </span>
                            {rec.priority && (
                              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${prioStyles.badge} ${prioStyles.text}`}>
                                {rec.priority.toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Action */}
                          <p className="text-text-primary text-sm font-600 mb-2">{rec.action}</p>

                          {/* Impact description */}
                          {impactText && (
                            <p className="text-text-secondary text-xs mb-3">
                              <span className="text-muted">Dopad: </span>{impactText}
                            </p>
                          )}

                          {/* Ease + impact indicators */}
                          {rec.ease != null && rec.impact != null && (
                            <div className="flex items-center gap-4 text-xs text-muted">
                              <span className="flex items-center gap-1.5">
                                <DotIndicator value={4 - rec.ease} colorFilled="#1B6840" />
                                Snadnost: {rec.ease === 1 ? 'Snadné' : rec.ease === 2 ? 'Střední' : 'Složité'}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <DotIndicator value={rec.impact} colorFilled="#F59E0B" />
                                Dopad: {rec.impact === 3 ? 'Velký' : rec.impact === 2 ? 'Střední' : 'Malý'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Site-wide issues */}
            {auditData.siteWideIssues?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Problémy celého webu</h3>
                <ul className="space-y-2">{auditData.siteWideIssues.map((issue, i) => <IssueItem key={i} text={issue} type="issue" />)}</ul>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── CTA section ── */}
      <div className="mt-14 rounded-2xl overflow-hidden">
        <div className="bg-accent px-8 py-12 text-center">
          <div className="text-accent-light/70 font-mono text-xs uppercase tracking-widest mb-3">Chcete to napravit?</div>
          <h3 className="font-display text-2xl md:text-3xl font-700 text-white mb-4">Pomůžeme vám s obsahem</h3>
          <p className="text-accent-light/80 text-sm max-w-md mx-auto mb-7">
            Jsme GetFound. Specializujeme se na SEO, tvorbu obsahu a výkonnostní marketing.
            Proměníme tyto chyby v příležitost pro váš růst.
          </p>
          <a
            href="https://getfound.cz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border-2 border-white/40 text-white font-display font-700 rounded-xl px-7 py-3 hover:bg-white hover:text-accent transition-all duration-150"
          >
            Domluvit bezplatnou konzultaci →
          </a>
        </div>
      </div>
    </div>
  )
}
