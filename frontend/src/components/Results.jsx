import { useState, useRef } from 'react'
import ScoreRing from './ScoreRing'

const PRIORITY_COLORS = {
  'vysoká': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', badge: 'bg-red-100' },
  'střední': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100' },
  'nízká':   { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100' }
}

// ─── Recommendation priority helpers ────────────────────────────────────────

function getRecCategory(rec) {
  const e = rec.ease || 2
  const imp = rec.impact || 2
  if (e === 1 && imp === 3) return 0
  if ((e === 1 && imp === 2) || (e === 2 && imp === 3)) return 1
  return 2
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
          <circle cx="4" cy="4" r="3.5" fill={i < value ? colorFilled : '#D1D5DB'} />
        </svg>
      ))}
    </span>
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

// ─── 3-page PDF Template ────────────────────────────────────────────────────

function PdfTemplate({ auditData, pdfRef }) {
  const score = auditData.overallScore
  const sc = scoreColor(score)
  const sl = scoreLabel(score)
  const date = new Date().toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long', year: 'numeric' })
  const dupsCount = (auditData.duplicateTitles?.length || 0) + (auditData.duplicateDescriptions?.length || 0)
  const pagesWithAI = (auditData.pages || []).filter(p => p.aiAnalysis).slice(0, 3)
  const urlShort = auditData.url?.replace(/^https?:\/\//, '').replace(/\/$/, '') || ''

  // ── Shared inline styles ──────────────────────────────────────────────────
  const P = {
    // Page container: exactly A4 in px, overflow hidden so slicing works cleanly
    page: {
      position: 'relative',
      width: '794px',
      height: '1123px',
      overflow: 'hidden',
      background: '#fff',
      fontFamily: "'DM Sans', Arial, sans-serif",
      fontSize: '12.5px',
      lineHeight: '1.55',
      color: '#111827',
      padding: '40px 48px',
      boxSizing: 'border-box',
    },
    pageBreak: { pageBreakAfter: 'always' },

    // Full header (page 1)
    header: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      paddingBottom: '16px', marginBottom: '22px', borderBottom: '2.5px solid #1B6840',
    },
    // Mini header (pages 2–3)
    miniHeader: {
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: '10px', marginBottom: '18px', borderBottom: '1.5px solid #1B6840',
    },
    logo: { display: 'flex', alignItems: 'center', gap: '9px' },
    logoBox: { width: '28px', height: '28px', background: '#1B6840', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    logoBoxSm: { width: '22px', height: '22px', background: '#1B6840', borderRadius: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

    // Footer: absolutely positioned inside each page div
    footer: {
      position: 'absolute',
      bottom: '30px', left: '48px', right: '48px',
      borderTop: '1px solid #E5E7EB', paddingTop: '10px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    footerText: { fontSize: '10px', color: '#9CA3AF' },

    // Content sections
    sectionTitle: { fontSize: '9.5px', fontWeight: '700', color: '#6B7280', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '10px' },
    section: { marginBottom: '18px' },
    divider: { borderTop: '1px solid #E5E7EB', margin: '16px 0' },

    // Score box
    scoreBox: { display: 'flex', alignItems: 'center', gap: '18px', background: '#ECFDF5', border: '1px solid rgba(27,104,64,0.2)', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' },
    scoreCircle: { width: '68px', height: '68px', border: `4.5px solid ${sc}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    scoreNum: { fontSize: '22px', fontWeight: '700', color: sc, fontFamily: 'monospace' },

    // AI summary
    summaryBox: { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '7px', padding: '10px 13px', marginBottom: '16px' },

    // Category bars
    catRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' },
    catLabel: { width: '145px', fontSize: '11.5px', color: '#374151', flexShrink: 0 },
    catBarBg: { flex: 1, height: '5.5px', background: '#E5E7EB', borderRadius: '3px', overflow: 'hidden' },
    catScore: { width: '26px', textAlign: 'right', fontSize: '11px', fontFamily: 'monospace', fontWeight: '600', flexShrink: 0 },

    // Issue/pass rows
    issueRow: { display: 'flex', alignItems: 'flex-start', gap: '7px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '5px', padding: '7px 9px', marginBottom: '5px', fontSize: '11.5px', color: '#374151' },
    passRow: { display: 'flex', alignItems: 'flex-start', gap: '7px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '5px', padding: '7px 9px', marginBottom: '5px', fontSize: '11.5px', color: '#374151' },

    // Recommendation card
    recCard: { border: '1px solid #E5E7EB', borderRadius: '7px', padding: '10px 12px', marginBottom: '8px', background: '#FAFAFA' },
    recHeader: { display: 'flex', alignItems: 'flex-start', gap: '9px' },
    recNum: { fontSize: '15px', fontWeight: '700', color: '#1B6840', fontFamily: 'monospace', minWidth: '22px', flexShrink: 0, paddingTop: '1px' },

    // Priority/ease/impact badges
    badgeHigh: { background: '#FEE2E2', color: '#DC2626', fontSize: '8.5px', fontWeight: '700', padding: '1.5px 6px', borderRadius: '20px', textTransform: 'uppercase' },
    badgeMid:  { background: '#FEF9C3', color: '#A16207', fontSize: '8.5px', fontWeight: '700', padding: '1.5px 6px', borderRadius: '20px', textTransform: 'uppercase' },
    badgeLow:  { background: '#DBEAFE', color: '#1D4ED8', fontSize: '8.5px', fontWeight: '700', padding: '1.5px 6px', borderRadius: '20px', textTransform: 'uppercase' },
    badgeEasy: { background: '#DCFCE7', color: '#15803d', fontSize: '8.5px', fontWeight: '600', padding: '1.5px 6px', borderRadius: '20px' },
    badgeMedium: { background: '#FEF9C3', color: '#A16207', fontSize: '8.5px', fontWeight: '600', padding: '1.5px 6px', borderRadius: '20px' },
    badgeHard: { background: '#FEE2E2', color: '#DC2626', fontSize: '8.5px', fontWeight: '600', padding: '1.5px 6px', borderRadius: '20px' },
    badgeImpact3: { background: '#EDE9FE', color: '#6D28D9', fontSize: '8.5px', fontWeight: '600', padding: '1.5px 6px', borderRadius: '20px' },
    badgeImpact2: { background: '#E0F2FE', color: '#0369A1', fontSize: '8.5px', fontWeight: '600', padding: '1.5px 6px', borderRadius: '20px' },
    badgeImpact1: { background: '#F3F4F6', color: '#6B7280', fontSize: '8.5px', fontWeight: '600', padding: '1.5px 6px', borderRadius: '20px' },

    // Table
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' },
    th: { padding: '6px 10px', textAlign: 'left', color: '#6B7280', fontWeight: '600', fontSize: '9.5px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
    td: { padding: '5.5px 10px', borderBottom: '1px solid #F3F4F6', color: '#374151' },

    // Page analysis card
    pageCard: { border: '1px solid #E5E7EB', borderRadius: '7px', padding: '10px 12px', marginBottom: '9px', background: '#FAFAFA' },

    // Link row
    linkRow: { display: 'flex', alignItems: 'center', gap: '8px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '4px', padding: '5px 9px', marginBottom: '4px', fontSize: '10.5px', fontFamily: 'monospace', color: '#374151' },

    // Two columns
    twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' },
  }

  function priBadge(p) {
    if ((p || '').toLowerCase() === 'vysoká') return P.badgeHigh
    if ((p || '').toLowerCase() === 'střední') return P.badgeMid
    return P.badgeLow
  }
  function easeBadge(e) {
    if (e === 1) return { style: P.badgeEasy,   label: '⚡ Snadné' }
    if (e === 2) return { style: P.badgeMedium, label: '⏱ Střední' }
    return               { style: P.badgeHard,   label: '⚙ Složité' }
  }
  function impBadge(i) {
    if (i === 3) return { style: P.badgeImpact3, label: '🎯 Velký dopad' }
    if (i === 2) return { style: P.badgeImpact2, label: '📈 Střední dopad' }
    return               { style: P.badgeImpact1, label: '➡ Malý dopad' }
  }

  // ── Shared header components ─────────────────────────────────────────────

  function FullHeader() {
    return (
      <div style={P.header}>
        <div>
          <div style={P.logo}>
            <div style={P.logoBox}><span style={{ color: '#fff', fontWeight: '800', fontSize: '14px' }}>G</span></div>
            <span style={{ fontWeight: '700', fontSize: '17px', color: '#111827' }}>
              Get<span style={{ color: '#1B6840' }}>Found</span>
              <span style={{ fontWeight: '400', color: '#6B7280', fontSize: '13px' }}> Content Audit Report</span>
            </span>
          </div>
          <div style={{ fontSize: '10.5px', color: '#9CA3AF', marginTop: '3px', marginLeft: '37px' }}>Automatizovaný audit obsahu e-shopu</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '600', color: '#111827', fontSize: '12px', marginBottom: '2px' }}>{date}</div>
          <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#6B7280' }}>{urlShort}</div>
        </div>
      </div>
    )
  }

  function MiniHeader({ page, total }) {
    return (
      <div style={P.miniHeader}>
        <div style={P.logo}>
          <div style={P.logoBoxSm}><span style={{ color: '#fff', fontWeight: '800', fontSize: '11px' }}>G</span></div>
          <span style={{ fontWeight: '700', fontSize: '13.5px', color: '#111827' }}>
            Get<span style={{ color: '#1B6840' }}>Found</span>
            <span style={{ fontWeight: '400', color: '#9CA3AF', fontSize: '11px' }}> Content Audit Report</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#9CA3AF' }}>{urlShort}</span>
          <span style={{ fontSize: '9.5px', color: '#9CA3AF' }}>Strana {page}/{total}</span>
        </div>
      </div>
    )
  }

  function Footer({ page, total }) {
    return (
      <div style={P.footer}>
        <div style={P.footerText}>Vygenerováno GetFound Content Audit Tool · {date}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={P.footerText}>Strana {page}/{total}</span>
          <span style={{ fontSize: '10.5px', color: '#1B6840', fontWeight: '700' }}>getfound.cz</span>
        </div>
      </div>
    )
  }

  const TOTAL = 3

  return (
    <div style={{ position: 'absolute', left: '-9999px', top: '0', pointerEvents: 'none' }} aria-hidden="true">
      <div ref={pdfRef}>

        {/* ══════════════ PAGE 1 – Executive Summary ══════════════ */}
        <div style={{ ...P.page, ...P.pageBreak }}>
          <FullHeader />

          {/* Score box */}
          <div style={P.scoreBox}>
            <div style={P.scoreCircle}><span style={P.scoreNum}>{score}</span></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '17px', fontWeight: '700', color: sc, marginBottom: '5px' }}>{sl}</div>
              <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Skóre: <strong style={{ color: sc }}>{score}/100</strong></span>
                <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Stránek: <strong style={{ color: '#111827' }}>{auditData.pagesAnalyzed}</strong></span>
                <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Broken linků: <strong style={{ color: '#EF4444' }}>{auditData.brokenLinksCount}</strong></span>
                {dupsCount > 0 && <span style={{ fontSize: '11.5px', color: '#6B7280' }}>Duplicit: <strong style={{ color: '#F59E0B' }}>{dupsCount}</strong></span>}
              </div>
            </div>
          </div>

          {/* AI summary */}
          {auditData.overallSummary && (
            <div style={P.summaryBox}>
              <div style={{ fontSize: '9px', fontWeight: '700', color: '#1B6840', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>🤖 AI Shrnutí</div>
              <div style={{ fontSize: '11.5px', color: '#374151', lineHeight: '1.6' }}>{auditData.overallSummary}</div>
            </div>
          )}

          {/* Category scores */}
          <div style={P.section}>
            <div style={P.sectionTitle}>Skóre po oblastech</div>
            {Object.entries(auditData.categoryScores || {}).map(([label, val]) => {
              const c = scoreColor(val)
              return (
                <div key={label} style={P.catRow}>
                  <div style={P.catLabel}>{label}</div>
                  <div style={P.catBarBg}><div style={{ height: '100%', width: `${val}%`, background: c, borderRadius: '3px' }} /></div>
                  <div style={{ ...P.catScore, color: c }}>{val}</div>
                </div>
              )
            })}
          </div>

          <div style={P.divider} />

          {/* Issues + Strengths */}
          <div style={{ ...P.twoCol, marginBottom: '16px' }}>
            {auditData.topIssues?.length > 0 && (
              <div>
                <div style={P.sectionTitle}>Hlavní problémy</div>
                {auditData.topIssues.slice(0, 4).map((issue, i) => (
                  <div key={i} style={P.issueRow}><span style={{ color: '#EF4444', flexShrink: 0 }}>⚠</span><span>{issue}</span></div>
                ))}
              </div>
            )}
            {auditData.topStrengths?.length > 0 && (
              <div>
                <div style={P.sectionTitle}>Silné stránky</div>
                {auditData.topStrengths.slice(0, 4).map((str, i) => (
                  <div key={i} style={P.passRow}><span style={{ color: '#22c55e', flexShrink: 0 }}>✓</span><span>{str}</span></div>
                ))}
              </div>
            )}
          </div>

          <Footer page={1} total={TOTAL} />
        </div>

        {/* ══════════════ PAGE 2 – Doporučení & Přehled stránek ══════════════ */}
        <div style={{ ...P.page, ...P.pageBreak }}>
          <MiniHeader page={2} total={TOTAL} />

          {/* Recommendations */}
          {auditData.topRecommendations?.length > 0 && (
            <div style={P.section}>
              <div style={P.sectionTitle}>Top doporučení</div>
              {auditData.topRecommendations.map((rec, i) => {
                const impactText = rec.impactDescription || (typeof rec.impact === 'string' ? rec.impact : '')
                const eb = rec.ease != null ? easeBadge(rec.ease) : null
                const ib = typeof rec.impact === 'number' ? impBadge(rec.impact) : null
                return (
                  <div key={i} style={P.recCard}>
                    <div style={P.recHeader}>
                      <span style={P.recNum}>{String(i + 1).padStart(2, '0')}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '5px', alignItems: 'center' }}>
                          <span style={priBadge(rec.priority)}>{(rec.priority || 'nízká').toUpperCase()}</span>
                          {eb && <span style={eb.style}>{eb.label}</span>}
                          {ib && <span style={ib.style}>{ib.label}</span>}
                        </div>
                        <div style={{ fontSize: '12.5px', color: '#111827', fontWeight: '600', marginBottom: '3px' }}>{rec.action}</div>
                        {impactText && <div style={{ fontSize: '11px', color: '#6B7280' }}>Dopad: {impactText}</div>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={P.divider} />

          {/* Site-wide issues + duplicates + keyword cannibalization */}
          <div style={P.twoCol}>
            <div>
              {auditData.siteWideIssues?.length > 0 && (
                <div style={P.section}>
                  <div style={P.sectionTitle}>Problémy celého webu</div>
                  {auditData.siteWideIssues.map((issue, i) => (
                    <div key={i} style={P.issueRow}><span style={{ color: '#EF4444', flexShrink: 0 }}>⚠</span><span>{issue}</span></div>
                  ))}
                </div>
              )}
              {auditData.keywordCannibalization?.length > 0 && (
                <div style={P.section}>
                  <div style={P.sectionTitle}>Keyword Cannibalization</div>
                  {auditData.keywordCannibalization.slice(0, 3).map((kw, i) => (
                    <div key={i} style={P.issueRow}>
                      <span style={{ color: '#F59E0B', flexShrink: 0 }}>⚠</span>
                      <span><strong>"{kw.keyword}"</strong> – {kw.urls?.length} stránek soutěží o stejné KW</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              {(auditData.duplicateTitles?.length > 0 || auditData.duplicateDescriptions?.length > 0) && (
                <div style={P.section}>
                  <div style={P.sectionTitle}>Duplicitní obsah</div>
                  {auditData.duplicateTitles?.slice(0, 3).map((d, i) => (
                    <div key={`t${i}`} style={P.issueRow}>
                      <span style={{ color: '#EF4444', flexShrink: 0 }}>⚠</span>
                      <span>Title: <span style={{ fontFamily: 'monospace', fontSize: '10.5px' }}>{d.title?.slice(0, 38)}{d.title?.length > 38 ? '…' : ''}</span></span>
                    </div>
                  ))}
                  {auditData.duplicateDescriptions?.slice(0, 3).map((d, i) => (
                    <div key={`d${i}`} style={P.issueRow}>
                      <span style={{ color: '#F59E0B', flexShrink: 0 }}>⚠</span>
                      <span>Meta: <span style={{ fontFamily: 'monospace', fontSize: '10.5px' }}>{d.desc?.slice(0, 38)}{d.desc?.length > 38 ? '…' : ''}</span></span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={P.divider} />

          {/* Pages score table */}
          <div style={P.section}>
            <div style={P.sectionTitle}>Hodnocení stránek</div>
            <div style={{ border: '1px solid #E5E7EB', borderRadius: '7px', overflow: 'hidden' }}>
              <table style={P.table}>
                <thead>
                  <tr>
                    <th style={P.th}>URL stránky</th>
                    <th style={{ ...P.th, width: '76px' }}>Typ</th>
                    <th style={{ ...P.th, width: '44px', textAlign: 'right' }}>Skóre</th>
                    <th style={{ ...P.th, width: '52px', textAlign: 'right' }}>Slov</th>
                  </tr>
                </thead>
                <tbody>
                  {(auditData.pages || []).slice(0, 9).map((page, i) => {
                    const c = scoreColor(page.score)
                    const typeL = { product: 'Produkt', category: 'Kategorie', homepage: 'Homepage', blog: 'Blog', other: 'Ostatní' }
                    const path = (() => { try { return new URL(page.url).pathname || '/' } catch { return page.url } })()
                    const isLast = i >= Math.min((auditData.pages?.length || 0) - 1, 8)
                    return (
                      <tr key={i} style={{ borderBottom: isLast ? 'none' : '1px solid #F3F4F6' }}>
                        <td style={{ ...P.td, fontFamily: 'monospace', fontSize: '10.5px', color: '#374151' }}>
                          {path.length > 48 ? path.slice(0, 46) + '…' : path}
                        </td>
                        <td style={{ ...P.td, color: '#6B7280', fontSize: '11px' }}>{typeL[page.type] || page.type}</td>
                        <td style={{ ...P.td, textAlign: 'right', fontWeight: '700', color: c, fontFamily: 'monospace' }}>{page.score}</td>
                        <td style={{ ...P.td, textAlign: 'right', color: '#9CA3AF', fontSize: '11px' }}>{page.wordCount}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Footer page={2} total={TOTAL} />
        </div>

        {/* ══════════════ PAGE 3 – AI Analýza & Broken links ══════════════ */}
        <div style={P.page}>
          <MiniHeader page={3} total={TOTAL} />

          {/* AI per-page analysis */}
          {pagesWithAI.length > 0 && (
            <div style={P.section}>
              <div style={P.sectionTitle}>AI analýza klíčových stránek</div>
              {pagesWithAI.map((page, i) => {
                const ai = page.aiAnalysis
                const path = (() => { try { return new URL(page.url).pathname || '/' } catch { return page.url } })()
                const c = scoreColor(page.score)
                const quickWin = ai.contentQuality?.quickWin || ai.firstImpression?.quickWin || ai.benefitGap?.quickWin || ''
                const topIssue = ai.firstImpression?.issues?.[0] || ai.benefitGap?.issues?.[0] || ''
                return (
                  <div key={i} style={P.pageCard}>
                    {/* Page url + score */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '8px' }}>
                      <div style={{ background: c, color: '#fff', fontFamily: 'monospace', fontSize: '10.5px', fontWeight: '700', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>{page.score}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '10.5px', color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</div>
                      <div style={{ fontSize: '9.5px', color: '#9CA3AF', flexShrink: 0 }}>{page.wordCount} slov</div>
                    </div>
                    {/* AI sub-scores */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '5px', marginBottom: '8px' }}>
                      {[
                        { label: 'První dojem', val: ai.firstImpression?.score },
                        { label: 'Benefit gap', val: ai.benefitGap?.score },
                        { label: 'Tón textu',   val: ai.emotionalTone?.score },
                        { label: 'Kvalita',      val: ai.contentQuality?.score },
                      ].map(({ label, val }) => {
                        if (val == null) return null
                        const c2 = scoreColor(val)
                        return (
                          <div key={label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '5px', padding: '5px 6px', textAlign: 'center' }}>
                            <div style={{ fontSize: '8.5px', color: '#9CA3AF', marginBottom: '2px' }}>{label}</div>
                            <div style={{ fontSize: '12.5px', fontWeight: '700', color: c2, fontFamily: 'monospace' }}>{val}</div>
                          </div>
                        )
                      })}
                    </div>
                    {/* Top issue */}
                    {topIssue && (
                      <div style={{ fontSize: '11px', color: '#374151', marginBottom: quickWin ? '6px' : '0', paddingLeft: '4px' }}>
                        <span style={{ color: '#EF4444' }}>⚠ </span>{topIssue}
                      </div>
                    )}
                    {/* Quick win */}
                    {quickWin && (
                      <div style={{ background: '#ECFDF5', border: '1px solid rgba(27,104,64,0.2)', borderRadius: '4px', padding: '5px 8px' }}>
                        <span style={{ fontSize: '8.5px', fontWeight: '700', color: '#1B6840', textTransform: 'uppercase', letterSpacing: '0.04em' }}>⚡ Quick Win: </span>
                        <span style={{ fontSize: '11px', color: '#374151' }}>{quickWin}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Broken links */}
          {auditData.brokenLinks?.length > 0 && (
            <div style={P.section}>
              <div style={P.divider} />
              <div style={P.sectionTitle}>Broken linky – 404 chyby ({auditData.brokenLinks.length})</div>
              {auditData.brokenLinks.slice(0, 10).map((link, i) => {
                const path = (() => { try { return new URL(link).pathname } catch { return link } })()
                return (
                  <div key={i} style={P.linkRow}>
                    <span style={{ color: '#EF4444', fontWeight: '700', flexShrink: 0 }}>404</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* CTA */}
          <div style={{ background: '#1B6840', borderRadius: '10px', padding: '18px 24px', marginTop: '20px', textAlign: 'center' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '7px' }}>Chcete to napravit?</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', marginBottom: '7px' }}>Pomůžeme vám s obsahem webu</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginBottom: '12px' }}>GetFound se specializuje na SEO, tvorbu obsahu a výkonnostní marketing pro e-shopy.</div>
            <div style={{ display: 'inline-block', fontSize: '12px', fontWeight: '700', color: '#fff', background: 'rgba(255,255,255,0.15)', padding: '6px 20px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.3)' }}>
              getfound.cz/kontakt
            </div>
          </div>

          <Footer page={3} total={TOTAL} />
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
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-600 mb-3"
            style={{ background: score >= 70 ? '#DCFCE7' : score >= 50 ? '#FEF3C7' : '#FEE2E2', color: sc }}
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
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <ScoreRing score={score} size={52} strokeWidth={5} />
          <div>
            <div className="text-xs text-muted mb-0.5">Skóre webu</div>
            <div className="text-sm font-600" style={{ color: sc }}>{sl}</div>
          </div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-display font-700 text-text-primary">{auditData.pagesAnalyzed}</div>
          <div className="text-xs text-muted mt-1">stránek auditováno</div>
        </div>
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-700 text-red-500 uppercase tracking-wide mb-0.5">Broken linků</div>
          <div className="text-2xl font-display font-700 text-red-500">{auditData.brokenLinksCount}</div>
          <div className="text-xs text-red-400">chyby 404</div>
        </div>
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
        const sortedRecs = [...recs]
          .map((r, origIdx) => ({ ...r, origIdx }))
          .sort((a, b) => getRecCategory(a) - getRecCategory(b))

        return (
          <div className="space-y-4">
            {sortedRecs.length > 0 && (
              <div className="space-y-3">
                {sortedRecs.map((rec) => {
                  const cat = getRecCategory(rec)
                  const catInfo = CATEGORY_INFO[cat]
                  const impactText = rec.impactDescription || (typeof rec.impact === 'string' ? rec.impact : '')
                  const p = rec.priority?.toLowerCase() || 'nízká'
                  const prioStyles = PRIORITY_COLORS[p] || PRIORITY_COLORS['nízká']

                  return (
                    <div key={rec.origIdx} className={`rounded-xl border p-5 ${catInfo.bg} ${catInfo.border}`}>
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-700 text-white mt-0.5" style={{ background: '#1B6840' }}>
                          {rec.origIdx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
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
                          <p className="text-text-primary text-sm font-600 mb-2">{rec.action}</p>
                          {impactText && (
                            <p className="text-text-secondary text-xs mb-3">
                              <span className="text-muted">Dopad: </span>{impactText}
                            </p>
                          )}
                          {rec.ease != null && typeof rec.impact === 'number' && (
                            <div className="flex items-center gap-4 text-xs text-muted">
                              <span className="flex items-center gap-1.5">
                                <DotIndicator value={4 - rec.ease} colorFilled="#1B6840" />
                                {rec.ease === 1 ? 'Snadné' : rec.ease === 2 ? 'Střední náročnost' : 'Složité'}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <DotIndicator value={rec.impact} colorFilled="#F59E0B" />
                                {rec.impact === 3 ? 'Velký dopad' : rec.impact === 2 ? 'Střední dopad' : 'Malý dopad'}
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
            href="https://getfound.cz/kontakt/"
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
