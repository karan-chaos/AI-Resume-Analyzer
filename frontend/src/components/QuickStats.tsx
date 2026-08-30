import { useMemo, useState } from 'react'
import { buildQuickStats, type QuickStat } from '../utils/quickStats'
import './QuickStats.css'

// ── Props ────────────────────────────────────────────────────────────────────

export interface QuickStatsProps {
  resumeText: string
  skills: string[]
  suggestions: string[]
  /** Open on first render. Off by default to keep the headline score focused. */
  defaultExpanded?: boolean
}

// ── Sub-components ───────────────────────────────────────────────────────────

/** Single stat card. */
function StatCard({ stat }: { stat: QuickStat }) {
  return (
    <div className="qs-card" title={stat.tooltip}>
      <div className="qs-card__header">
        <span className="qs-card__icon">{stat.icon}</span>
        <span className="qs-card__label">{stat.label}</span>
      </div>
      <div className="qs-card__value">{stat.value}</div>
      {stat.detail && <div className="qs-card__detail">{stat.detail}</div>}
      {stat.progress !== null && (
        <div
          className="qs-card__bar"
          role="progressbar"
          aria-valuenow={stat.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${stat.label}: ${stat.progress}%`}
        >
          <div
            className="qs-card__bar-fill"
            style={{ width: `${stat.progress}%`, background: stat.color }}
          />
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export function QuickStats({ resumeText, skills, suggestions, defaultExpanded = false }: QuickStatsProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const stats = useMemo(
    () => buildQuickStats({ resumeText, skills, suggestions }),
    [resumeText, skills, suggestions],
  )

  // Don't render if there is nothing to show.
  if (skills.length === 0 && !resumeText) return null

  return (
    <section className="quick-stats" aria-labelledby="quick-stats-heading">
      <button
        type="button"
        className="quick-stats__toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls="quick-stats-panel"
      >
        <span className="quick-stats__toggle-text">
          <span id="quick-stats-heading" className="quick-stats__title">
            📊 Quick Stats
          </span>
          <span className="quick-stats__subtitle">
            {skills.length} skills • {stats.find((s) => s.key === 'sections')?.value ?? 0} sections
          </span>
        </span>
        <span className="quick-stats__chevron" aria-hidden="true">
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div id="quick-stats-panel" className="quick-stats__panel">
          <div className="quick-stats__grid">
            {stats.map((stat) => (
              <StatCard key={stat.key} stat={stat} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default QuickStats
