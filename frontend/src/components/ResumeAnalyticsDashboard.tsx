import { useMemo } from 'react'
import type { AnalysisEntry } from '../hooks/useAnalysisHistory'
import {
  useResumeAnalytics,
  type ScoreTrendPoint,
  type SkillFrequency,
  type RoleBreakdown,
  type ImprovementMetric,
} from '../hooks/useResumeAnalytics'
import './ResumeAnalyticsDashboard.css'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_SKILLS_SHOWN = 12

const SCORE_COLORS = { good: '#34d399', mid: '#fbbf24', low: '#f87171' } as const

function scoreColorClass(score: number): string {
  if (score >= 75) return 'analytics-dashboard__role-score--good'
  if (score >= 50) return 'analytics-dashboard__role-score--mid'
  return 'analytics-dashboard__role-score--low'
}

function getGrade(avgScore: number): { letter: string; label: string; className: string } {
  if (avgScore >= 85) return { letter: 'A', label: 'Excellent', className: 'analytics-dashboard__grade--a' }
  if (avgScore >= 70) return { letter: 'B', label: 'Good', className: 'analytics-dashboard__grade--b' }
  if (avgScore >= 50) return { letter: 'C', label: 'Needs Work', className: 'analytics-dashboard__grade--c' }
  return { letter: 'D', label: 'Improvement Needed', className: 'analytics-dashboard__grade--d' }
}

/* ------------------------------------------------------------------ */
/*  SVG Mini Trend Chart                                               */
/* ------------------------------------------------------------------ */

function TrendChart({ points }: { points: ScoreTrendPoint[] }) {
  const { svg, viewBox } = useMemo(() => {
    const w = 560
    const h = 160
    const pad = { top: 16, right: 16, bottom: 28, left: 36 }
    const innerW = w - pad.left - pad.right
    const innerH = h - pad.top - pad.bottom

    const minScore = 0
    const maxScore = 100

    const xScale = (i: number) =>
      points.length === 1
        ? pad.left + innerW / 2
        : pad.left + (i / (points.length - 1)) * innerW
    const yScale = (s: number) =>
      pad.top + innerH - ((s - minScore) / (maxScore - minScore)) * innerH

    // Build path
    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(p.score).toFixed(1)}`)
      .join(' ')

    // Area fill (closed polygon)
    const areaD =
      pathD +
      ` L ${xScale(points.length - 1).toFixed(1)} ${yScale(0).toFixed(1)}` +
      ` L ${xScale(0).toFixed(1)} ${yScale(0).toFixed(1)} Z`

    // Grid lines
    const gridLines = [0, 25, 50, 75, 100].map((val) => ({
      y: yScale(val),
      label: String(val),
    }))

    return {
      svg: {
        width: w,
        height: h,
        pathD,
        areaD,
        points,
        xScale,
        yScale,
        pad,
        innerH,
        gridLines,
      },
      viewBox: `0 0 ${w} ${h}`,
    }
  }, [points])

  if (points.length === 0) return null

  return (
    <div className="analytics-dashboard__trend-chart">
      <svg viewBox={viewBox} width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Score trend chart">
        {/* Grid lines */}
        {svg.gridLines.map((line) => (
          <g key={line.label}>
            <line
              x1={svg.pad.left}
              y1={line.y}
              x2={svg.width - svg.pad.right}
              y2={line.y}
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={1}
            />
            <text
              x={svg.pad.left - 6}
              y={line.y + 4}
              textAnchor="end"
              fontSize={10}
              fill="#64748b"
            >
              {line.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <path d={svg.areaD} fill="url(#trendGrad)" opacity={0.3} />

        {/* Gradient def */}
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Line */}
        <path d={svg.pathD} fill="none" stroke="#818cf8" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Data points */}
        {svg.points.map((p, i) => (
          <g key={i}>
            <circle cx={svg.xScale(i)} cy={svg.yScale(p.score)} r={3.5} fill="#818cf8" />
            <title>{`${p.label}: ${p.score}% — ${p.fileName}`}</title>
          </g>
        ))}
      </svg>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Skill Frequency Bars                                               */
/* ------------------------------------------------------------------ */

function SkillBars({ skills }: { skills: SkillFrequency[] }) {
  const shown = skills.slice(0, MAX_SKILLS_SHOWN)

  return (
    <div className="analytics-dashboard__skill-list">
      {shown.map((skill) => (
        <div key={skill.skill} className="analytics-dashboard__skill-row">
          <span className="analytics-dashboard__skill-name" title={skill.skill}>
            {skill.skill}
          </span>
          <span className="analytics-dashboard__skill-count">
            {skill.percentage}%
          </span>
          <div className="analytics-dashboard__skill-bar">
            <div
              className={`analytics-dashboard__skill-bar-fill analytics-dashboard__skill-bar-fill--${skill.bestStatus}`}
              style={{ width: `${skill.percentage}%` }}
            />
          </div>
        </div>
      ))}
      {skills.length > MAX_SKILLS_SHOWN && (
        <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', paddingTop: '0.3rem' }}>
          +{skills.length - MAX_SKILLS_SHOWN} more skills
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Role Breakdown Table                                               */
/* ------------------------------------------------------------------ */

function RoleTable({ roles }: { roles: RoleBreakdown[] }) {
  return (
    <table className="analytics-dashboard__role-table">
      <thead>
        <tr>
          <th>Role</th>
          <th>Analyses</th>
          <th>Avg</th>
          <th>Best</th>
          <th>Latest</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r) => (
          <tr key={r.role}>
            <td className="analytics-dashboard__role-name">{r.role}</td>
            <td>{r.count}</td>
            <td className={`analytics-dashboard__role-score ${scoreColorClass(r.avgScore)}`}>
              {r.avgScore}%
            </td>
            <td className={`analytics-dashboard__role-score ${scoreColorClass(r.bestScore)}`}>
              {r.bestScore}%
            </td>
            <td className={`analytics-dashboard__role-score ${scoreColorClass(r.latestScore)}`}>
              {r.latestScore}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/* ------------------------------------------------------------------ */
/*  Improvement Cards                                                  */
/* ------------------------------------------------------------------ */

const DIR_ICON: Record<ImprovementMetric['direction'], string> = {
  up: '▲',
  down: '▼',
  flat: '—',
}

function ImprovementCards({ metrics }: { metrics: ImprovementMetric[] }) {
  return (
    <div className="analytics-dashboard__improvements">
      {metrics.map((m) => (
        <div key={m.label} className="analytics-dashboard__improvement">
          <div className="analytics-dashboard__improvement-label">{m.label}</div>
          <div
            className={`analytics-dashboard__improvement-value analytics-dashboard__improvement-value--${m.direction}`}
          >
            <span aria-hidden="true">{DIR_ICON[m.direction]}</span>
            {m.value}
          </div>
          <div className="analytics-dashboard__improvement-detail">{m.detail}</div>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main Export                                                        */
/* ------------------------------------------------------------------ */

interface ResumeAnalyticsDashboardProps {
  entries: AnalysisEntry[]
  defaultExpanded?: boolean
}

export function ResumeAnalyticsDashboard({
  entries,
  defaultExpanded = false,
}: ResumeAnalyticsDashboardProps) {
  const analytics = useResumeAnalytics(entries)
  const grade = useMemo(() => getGrade(analytics.averageScore), [analytics.averageScore])

  if (entries.length === 0) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-dashboard__empty">
          <div className="analytics-dashboard__empty-icon">📊</div>
          <div className="analytics-dashboard__empty-text">
            Upload and analyze resumes to see your personal analytics dashboard
          </div>
        </div>
      </div>
    )
  }

  return (
    <section className="analytics-dashboard" aria-label="Resume analytics dashboard">
      <div className="analytics-dashboard__header">
        <div>
          <h2 className="analytics-dashboard__title">Analytics Dashboard</h2>
          <p className="analytics-dashboard__subtitle">
            Insights from {analytics.totalAnalyses} analysis{analytics.totalAnalyses !== 1 ? 'es' : ''}
          </p>
        </div>
        <div className={`analytics-dashboard__grade ${grade.className}`}>
          <span className="analytics-dashboard__grade-letter">{grade.letter}</span>
          <span className="analytics-dashboard__grade-label">{grade.label}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="analytics-dashboard__stats">
        <div className="analytics-dashboard__stat">
          <div className="analytics-dashboard__stat-value analytics-dashboard__stat-value--accent">
            {analytics.averageScore}%
          </div>
          <div className="analytics-dashboard__stat-label">Avg Score</div>
        </div>
        <div className="analytics-dashboard__stat">
          <div className="analytics-dashboard__stat-value">{analytics.bestScore}%</div>
          <div className="analytics-dashboard__stat-label">Best Score</div>
        </div>
        <div className="analytics-dashboard__stat">
          <div className="analytics-dashboard__stat-value">{analytics.uniqueSkills}</div>
          <div className="analytics-dashboard__stat-label">Unique Skills</div>
        </div>
        <div className="analytics-dashboard__stat">
          <div className="analytics-dashboard__stat-value">{analytics.totalAnalyses}</div>
          <div className="analytics-dashboard__stat-label">Analyses</div>
        </div>
      </div>

      {/* Score Trend */}
      {analytics.trendPoints.length >= 2 && (
        <div className="analytics-dashboard__section">
          <h3 className="analytics-dashboard__section-title">📈 Score Trend</h3>
          <TrendChart points={analytics.trendPoints} />
        </div>
      )}

      {/* Improvements */}
      {analytics.improvements.length > 0 && (
        <div className="analytics-dashboard__section">
          <h3 className="analytics-dashboard__section-title">📊 Progress Metrics</h3>
          <ImprovementCards metrics={analytics.improvements} />
        </div>
      )}

      {/* Skill Frequency */}
      {analytics.skillFrequencies.length > 0 && (
        <div className="analytics-dashboard__section">
          <h3 className="analytics-dashboard__section-title">🔧 Skill Frequency</h3>
          <SkillBars skills={analytics.skillFrequencies} />
        </div>
      )}

      {/* Role Breakdown */}
      {analytics.roleBreakdowns.length > 0 && (
        <div className="analytics-dashboard__section">
          <h3 className="analytics-dashboard__section-title">🎯 By Target Role</h3>
          <RoleTable roles={analytics.roleBreakdowns} />
        </div>
      )}
    </section>
  )
}

export default ResumeAnalyticsDashboard
