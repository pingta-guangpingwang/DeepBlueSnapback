import { useState, useEffect, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { useHealthMetrics } from '../../hooks/useHealthMetrics'
import { useI18n } from '../../i18n'
import type { HealthReport } from '../../types/health'

const GRADE_COLORS: Record<string, { ring: string; text: string; bg: string }> = {
  A: { ring: '#22c55e', text: '#166534', bg: '#dcfce7' },
  B: { ring: '#3b82f6', text: '#1e40af', bg: '#dbeafe' },
  C: { ring: '#f59e0b', text: '#92400e', bg: '#fef3c7' },
  D: { ring: '#f97316', text: '#9a3412', bg: '#ffedd5' },
  F: { ring: '#ef4444', text: '#991b1b', bg: '#fee2e2' },
}

function RingScore({ score, grade }: { score: number; grade: string }) {
  const colors = GRADE_COLORS[grade] || GRADE_COLORS.F
  const radius = 80
  const stroke = 10
  const normalizedRadius = radius - stroke
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div className="health-ring-container">
      <svg height={radius * 2} width={radius * 2} className="health-ring-svg">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={colors.ring}
          fill="transparent"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="health-ring-progress"
        />
      </svg>
      <div className="health-ring-center">
        <span className="health-ring-grade" style={{ color: colors.ring }}>{grade}</span>
        <span className="health-ring-score">{score}</span>
        <span className="health-ring-max">/100</span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, highlight }: {
  label: string
  value: number | string
  sub?: string
  highlight?: 'red' | 'yellow' | 'green'
}) {
  return (
    <div className={`health-metric-card${highlight ? ` health-metric-${highlight}` : ''}`}>
      <span className="health-metric-value">{value}</span>
      <span className="health-metric-label">{label}</span>
      {sub && <span className="health-metric-sub">{sub}</span>}
    </div>
  )
}

function IssueRow({ issue, index }: { issue: import('../../types/health').QualityReport; index: number }) {
  return (
    <div className="health-issue-row">
      <span className="health-issue-rank">#{index + 1}</span>
      <div className="health-issue-info">
        <span className="health-issue-name">{issue.label}</span>
        <span className="health-issue-path">{issue.path}</span>
      </div>
      <div className="health-issue-stats">
        {issue.isGodModule && <span className="health-issue-tag tag-god">God Module</span>}
        {issue.isOrphan && <span className="health-issue-tag tag-orphan">Orphan</span>}
        <span className="health-issue-complexity">CC {issue.cyclomaticComplexity}</span>
        <span className={`health-issue-score ${issue.score < 60 ? 'low' : ''}`}>{issue.score}pts</span>
      </div>
    </div>
  )
}

function SuggestionCard({ s }: { s: import('../../types/health').Suggestion }) {
  const { t } = useI18n()
  const levelIcons: Record<string, string> = { critical: '🔴', warning: '🟡', info: '🔵' }

  // Build i18n keys from suggestion code
  const titleKey = `sug_${s.code}_title` as keyof typeof t.health
  const descKey = `sug_${s.code}_desc` as keyof typeof t.health
  let title = String(t.health[titleKey] || s.code)
  let desc = String(t.health[descKey] || '')

  // Replace params like {count}, {value}
  for (const [k, v] of Object.entries(s.params)) {
    title = title.replace(`{${k}}`, String(v))
    desc = desc.replace(`{${k}}`, String(v))
  }

  return (
    <div className={`health-suggestion health-suggestion-${s.level}`}>
      <span className="health-suggestion-icon">{levelIcons[s.level]}</span>
      <div className="health-suggestion-body">
        <span className="health-suggestion-title">{title}</span>
        <span className="health-suggestion-desc">{desc}</span>
        {s.module && <code className="health-suggestion-module">{s.module}</code>}
      </div>
    </div>
  )
}

export default function HealthDashboard() {
  const [state] = useAppState()
  const { t } = useI18n()
  const { report, loading, error, analyzeHealth, clearReport } = useHealthMetrics()
  const [lastCommitId, setLastCommitId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<'summary' | 'issues' | 'suggestions'>('summary')

  useEffect(() => {
    const fetchLatestCommit = async () => {
      if (!state.repoPath) return
      try {
        const result = await window.electronAPI.getHistoryStructured(state.repoPath)
        if (result.success && result.commits && result.commits.length > 0) {
          setLastCommitId(result.commits[0].id)
        }
      } catch {
        // ignore
      }
    }
    fetchLatestCommit()
  }, [state.repoPath])

  const handleAnalyze = useCallback(() => {
    if (lastCommitId) {
      analyzeHealth(lastCommitId)
    }
  }, [lastCommitId, analyzeHealth])

  const gradeColors = report ? (GRADE_COLORS[report.grade] || GRADE_COLORS.F) : null

  return (
    <div className="health-dashboard">
      <div className="health-header">
        <h2>{t.health.title}</h2>
        <div className="health-header-actions">
          <button
            className="health-analyze-btn"
            onClick={handleAnalyze}
            disabled={loading || !lastCommitId}
          >
            {loading ? t.health.analyzing : t.health.analyze}
          </button>
          {report && (
            <button className="health-clear-btn" onClick={clearReport}>
              {t.health.clear}
            </button>
          )}
        </div>
      </div>

      {error && <div className="health-error">{error}</div>}

      {!report && !loading && !error && (
        <div className="health-empty">
          <div className="health-empty-icon">🩺</div>
          <p>{t.health.emptyHint}</p>
        </div>
      )}

      {loading && (
        <div className="health-loading">
          <div className="health-spinner" />
          <p>{t.health.analyzing}</p>
        </div>
      )}

      {report && (
        <>
          <div className="health-score-section">
            <RingScore score={report.score} grade={report.grade} />
            <div className="health-score-meta">
              <span className="health-grade-label" style={{ color: gradeColors?.text, background: gradeColors?.bg }}>
                {String((t.health as Record<string, string>)[report.gradeLabel] || report.gradeLabel)}
              </span>
              <span className="health-timestamp">
                {new Date(report.timestamp).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="health-section-tabs">
            {(['summary', 'issues', 'suggestions'] as const).map(section => (
              <button
                key={section}
                className={`health-section-tab ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                {t.health[section]}
              </button>
            ))}
          </div>

          {activeSection === 'summary' && (
            <div className="health-metrics-grid">
              <MetricCard label={t.health.totalModules} value={report.summary.totalModules} />
              <MetricCard
                label={t.health.godModules}
                value={report.summary.godModules}
                highlight={report.summary.godModules > 0 ? 'red' : 'green'}
                sub={report.summary.godModules > 0 ? t.health.needsAttention : ''}
              />
              <MetricCard
                label={t.health.orphans}
                value={report.summary.orphans}
                highlight={report.summary.orphans > 0 ? 'yellow' : 'green'}
              />
              <MetricCard
                label={t.health.painZoneModules}
                value={report.summary.painZoneModules}
                highlight={report.summary.painZoneModules > 0 ? 'red' : 'green'}
              />
              <MetricCard label={t.health.avgComplexity} value={report.summary.avgComplexity.toFixed(1)} />
              <MetricCard label={t.health.avgCoupling} value={report.summary.avgCoupling.toFixed(1)} />
              <MetricCard label={t.health.cloneGroups} value={report.summary.cloneGroups} />
            </div>
          )}

          {activeSection === 'issues' && (
            <div className="health-issues-list">
              {report.topIssues.length === 0 ? (
                <div className="health-no-issues">{t.health.noIssues}</div>
              ) : (
                report.topIssues.map((issue, i) => (
                  <IssueRow key={issue.nodeId} issue={issue} index={i} />
                ))
              )}
            </div>
          )}

          {activeSection === 'suggestions' && (
            <div className="health-suggestions-list">
              {report.suggestions.length === 0 ? (
                <div className="health-no-suggestions">{t.health.noSuggestions}</div>
              ) : (
                report.suggestions.map((s, i) => (
                  <SuggestionCard key={i} s={s} />
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
