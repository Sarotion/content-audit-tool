import { useState } from 'react'
import ScoreRing from './ScoreRing'

const PRIORITY_COLORS = {
  'vysoká': { bg: 'bg-red-950/40', border: 'border-red-800/50', text: 'text-red-400', badge: 'bg-red-900/60' },
  'střední': { bg: 'bg-yellow-950/40', border: 'border-yellow-800/50', text: 'text-yellow-400', badge: 'bg-yellow-900/60' },
  'nízká': { bg: 'bg-blue-950/40', border: 'border-blue-800/50', text: 'text-blue-400', badge: 'bg-blue-900/60' }
}

function IssueItem({ text, type = 'issue' }) {
  const isIssue = type === 'issue'
  return (
    <div className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
      isIssue
        ? 'bg-red-950/20 border-red-900/30 text-text-secondary'
        : 'bg-green-950/20 border-green-900/30 text-text-secondary'
    }`}>
      <span className={`shrink-0 mt-0.5 ${isIssue ? 'text-red-400' : 'text-accent'}`}>
        {isIssue ? '⚠' : '✓'}
      </span>
      <span>{text}</span>
    </div>
  )
}

function CheckSection({ title, check, icon }) {
  if (!check) return null
  const scoreColor = check.score >= 71 ? '#4ade80' : check.score >= 41 ? '#facc15' : '#f87171'
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-body font-500 text-text-primary">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-1 w-16 bg-surface rounded-full overflow-hidden">
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
  const scoreColor = data.score >= 71 ? '#4ade80' : data.score >= 41 ? '#facc15' : '#f87171'
  return (
    <div className="bg-card border border-border rounded-xl p-4">
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
  const scoreColor = page.score >= 71 ? '#4ade80' : page.score >= 41 ? '#facc15' : '#f87171'
  const typeLabels = { product: 'Produkt', category: 'Kategorie', homepage: 'Homepage', blog: 'Blog', other: 'Ostatní' }

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-card hover:bg-surface/50 transition-colors text-left"
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
        <div className="px-4 pb-4 pt-2 border-t border-border bg-surface/20 space-y-3">
          {/* Rule checks */}
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
              <div key={label} className="flex items-center justify-between bg-card rounded-lg px-3 py-2 border border-border">
                <span className="text-xs text-muted">{icon} {label}</span>
                <span className="text-xs font-mono" style={{
                  color: check.score >= 71 ? '#4ade80' : check.score >= 41 ? '#facc15' : '#f87171'
                }}>{check.score}</span>
              </div>
            ) : null)}
          </div>

          {/* AI analysis */}
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

export default function Results({ auditData, onRestart }) {
  const [tab, setTab] = useState('overview')
  const score = auditData.overallScore
  const scoreColor = score >= 71 ? '#4ade80' : score >= 41 ? '#facc15' : '#f87171'
  const scoreLabel = score >= 71 ? 'Dobrý základ' : score >= 41 ? 'Potřebuje práci' : 'Kritický stav'

  const tabs = [
    { id: 'overview', label: 'Přehled' },
    { id: 'pages', label: `Stránky (${auditData.pages?.length || 0})` },
    { id: 'recommendations', label: 'Doporučení' }
  ]

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10 fade-up">
        <div>
          <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 mb-4">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: scoreColor }} />
            <span className="text-xs font-mono text-muted uppercase tracking-widest">{scoreLabel}</span>
          </div>
          <h2 className="font-display text-3xl font-800 text-text-primary mb-1">
            Výsledky auditu
          </h2>
          <p className="text-muted font-mono text-sm">{auditData.url}</p>
        </div>
        <button
          onClick={onRestart}
          className="text-xs font-mono text-muted border border-border rounded-lg px-4 py-2 hover:border-accent hover:text-accent transition-colors"
        >
          ← Nový audit
        </button>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 fade-up fade-up-1">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
          <ScoreRing score={score} size={56} strokeWidth={5} />
          <div>
            <div className="text-xs text-muted">Celkové skóre</div>
            <div className="font-display text-lg font-700" style={{ color: scoreColor }}>{scoreLabel}</div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-display font-700 text-text-primary">{auditData.pagesAnalyzed}</div>
          <div className="text-xs text-muted mt-1">stránek auditováno</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-display font-700 text-red-400">{auditData.brokenLinksCount}</div>
          <div className="text-xs text-muted mt-1">broken linků</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="text-2xl font-display font-700 text-yellow-400">
            {(auditData.duplicateTitles?.length || 0) + (auditData.duplicateDescriptions?.length || 0)}
          </div>
          <div className="text-xs text-muted mt-1">duplicit nalezeno</div>
        </div>
      </div>

      {/* Summary */}
      {auditData.overallSummary && (
        <div className="bg-card border border-accent/20 rounded-xl p-5 mb-8 fade-up fade-up-2">
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
          {/* Category scores */}
          <div>
            <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Skóre po oblastech</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {Object.entries(auditData.categoryScores || {}).map(([label, score]) => {
                const c = score >= 71 ? '#4ade80' : score >= 41 ? '#facc15' : '#f87171'
                return (
                  <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                    <div className="text-2xl font-display font-700 shrink-0 w-12" style={{ color: c }}>{score}</div>
                    <div className="flex-1">
                      <div className="text-sm text-text-primary mb-1.5">{label}</div>
                      <div className="h-1 bg-surface rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: c }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top issues */}
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

          {/* Strengths */}
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

          {/* Broken links */}
          {auditData.brokenLinks?.length > 0 && (
            <div>
              <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Broken linky</h3>
              <div className="space-y-1">
                {auditData.brokenLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2 bg-card border border-red-900/30 rounded-lg px-3 py-2">
                    <span className="text-red-400 text-xs">404</span>
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
                  <span className={`text-2xl font-display font-800 ${styles.text}`}>{String(i + 1).padStart(2, '0')}</span>
                </div>
              </div>
            )
          })}

          {/* Site-wide issues */}
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

          {/* Keyword cannibalization */}
          {auditData.keywordCannibalization?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-mono text-muted uppercase tracking-wide mb-4">Keyword kanibalizace</h3>
              {auditData.keywordCannibalization.map((item, i) => (
                <div key={i} className="bg-card border border-yellow-900/30 rounded-xl p-4 mb-2">
                  <div className="text-sm font-mono text-yellow-400 mb-2">"{item.keyword}"</div>
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
      <div className="mt-12 bg-gradient-to-br from-card to-surface border border-accent/20 rounded-2xl p-8 text-center fade-up">
        <div className="text-accent font-mono text-xs uppercase tracking-widest mb-3">Chcete to napravit?</div>
        <h3 className="font-display text-2xl font-700 text-text-primary mb-3">
          Pomůžeme vám s obsahem
        </h3>
        <p className="text-text-secondary text-sm max-w-md mx-auto mb-6">
          Náš tým se specializuje na content strategii a SEO copywriting pro e-shopy.
          Ozveme se vám s konkrétním návrhem.
        </p>
        <a
          href="mailto:info@vaseagency.cz"
          className="inline-flex items-center gap-2 bg-accent text-black font-display font-700 rounded-lg px-8 py-3 hover:bg-green-300 transition-colors"
        >
          Domluvit konzultaci →
        </a>
      </div>
    </div>
  )
}
