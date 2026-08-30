import { useMemo } from 'react'
import type { AnalysisEntry } from './useAnalysisHistory'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SkillFrequency {
  skill: string
  count: number
  percentage: number
  /** 'matched' | 'missing' | 'partial' — best status across analyses */
  bestStatus: 'matched' | 'missing' | 'partial'
}

export interface ScoreTrendPoint {
  label: string
  score: number
  timestamp: number
  fileName: string
}

export interface RoleBreakdown {
  role: string
  count: number
  avgScore: number
  bestScore: number
  latestScore: number
}

export interface ImprovementMetric {
  label: string
  value: number
  direction: 'up' | 'down' | 'flat'
  detail: string
}

export interface AnalyticsData {
  totalAnalyses: number
  averageScore: number
  bestScore: number
  worstScore: number
  scoreRange: number
  trendPoints: ScoreTrendPoint[]
  skillFrequencies: SkillFrequency[]
  roleBreakdowns: RoleBreakdown[]
  improvements: ImprovementMetric[]
  uniqueSkills: number
  mostCommonRole: string
}

/* ------------------------------------------------------------------ */
/*  Pure computation helpers                                           */
/* ------------------------------------------------------------------ */

function computeSkillFrequencies(entries: AnalysisEntry[]): SkillFrequency[] {
  const skillMap = new Map<string, { matched: number; missing: number; partial: number; total: number }>()

  for (const entry of entries) {
    const matched = new Set(entry.matchedSkills.map((s) => s.toLowerCase()))
    const missing = new Set(entry.missingSkills.map((s) => s.toLowerCase()))
    const partial = new Set(
      (entry.partialSkills ?? []).map((p) => p.skill.toLowerCase()),
    )

    const allSkills = new Set([...matched, ...missing, ...partial])
    for (const skill of allSkills) {
      const existing = skillMap.get(skill) ?? { matched: 0, missing: 0, partial: 0, total: 0 }
      if (matched.has(skill)) existing.matched++
      else if (partial.has(skill)) existing.partial++
      else if (missing.has(skill)) existing.missing++
      existing.total++
      skillMap.set(skill, existing)
    }

    // Also track from skills_found for entries without matched/missing split
    if (entry.matchedSkills.length === 0 && entry.missingSkills.length === 0) {
      for (const skill of entry.skills) {
        const key = skill.toLowerCase()
        const existing = skillMap.get(key) ?? { matched: 0, missing: 0, partial: 0, total: 0 }
        existing.matched++
        existing.total++
        skillMap.set(key, existing)
      }
    }
  }

  const totalEntries = Math.max(entries.length, 1)

  return Array.from(skillMap.entries())
    .map(([skill, counts]) => {
      const bestStatus: 'matched' | 'missing' | 'partial' =
        counts.matched > 0 ? 'matched' : counts.partial > 0 ? 'partial' : 'missing'
      return {
        skill,
        count: counts.total,
        percentage: Math.round((counts.total / totalEntries) * 100),
        bestStatus,
      }
    })
    .sort((a, b) => b.count - a.count)
}

function computeRoleBreakdowns(entries: AnalysisEntry[]): RoleBreakdown[] {
  const roleMap = new Map<string, number[]>()

  for (const entry of entries) {
    const role = entry.targetRole || 'Unspecified'
    const existing = roleMap.get(role) ?? []
    existing.push(entry.score)
    roleMap.set(role, existing)
  }

  return Array.from(roleMap.entries())
    .map(([role, scores]) => ({
      role,
      count: scores.length,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      bestScore: Math.max(...scores),
      latestScore: scores[scores.length - 1],
    }))
    .sort((a, b) => b.count - a.count)
}

function computeImprovements(entries: AnalysisEntry[]): ImprovementMetric[] {
  if (entries.length < 2) return []

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const improvements: ImprovementMetric[] = []

  // Score delta
  const scoreDelta = last.score - first.score
  improvements.push({
    label: 'Score Change',
    value: Math.abs(scoreDelta),
    direction: scoreDelta > 0 ? 'up' : scoreDelta < 0 ? 'down' : 'flat',
    detail: `${first.score}% → ${last.score}%`,
  })

  // Skills breadth
  const firstSkillCount = first.matchedSkills.length + (first.skills?.length ?? 0)
  const lastSkillCount = last.matchedSkills.length + (last.skills?.length ?? 0)
  const skillDelta = lastSkillCount - firstSkillCount
  improvements.push({
    label: 'Skill Coverage',
    value: Math.abs(skillDelta),
    direction: skillDelta > 0 ? 'up' : skillDelta < 0 ? 'down' : 'flat',
    detail: `${firstSkillCount} → ${lastSkillCount} detected skills`,
  })

  // Role consistency
  const uniqueRoles = new Set(entries.map((e) => e.targetRole)).size
  improvements.push({
    label: 'Target Roles',
    value: uniqueRoles,
    direction: 'flat',
    detail: `Across ${uniqueRoles} unique role${uniqueRoles !== 1 ? 's' : ''}`,
  })

  // Consistency (score variance)
  const scores = entries.map((e) => e.score)
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length
  const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / scores.length
  const stdDev = Math.round(Math.sqrt(variance))
  improvements.push({
    label: 'Consistency',
    value: stdDev,
    direction: stdDev <= 10 ? 'up' : 'down',
    detail: `±${stdDev} score deviation`,
  })

  return improvements
}

/* ------------------------------------------------------------------ */
/*  Main hook                                                          */
/* ------------------------------------------------------------------ */

export function useResumeAnalytics(entries: AnalysisEntry[]): AnalyticsData {
  return useMemo(() => {
    if (entries.length === 0) {
      return {
        totalAnalyses: 0,
        averageScore: 0,
        bestScore: 0,
        worstScore: 0,
        scoreRange: 0,
        trendPoints: [],
        skillFrequencies: [],
        roleBreakdowns: [],
        improvements: [],
        uniqueSkills: 0,
        mostCommonRole: '',
      }
    }

    const scores = entries.map((e) => e.score)
    const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)

    const trendPoints: ScoreTrendPoint[] = sorted.map((entry) => {
      const date = new Date(entry.timestamp)
      return {
        label: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: entry.score,
        timestamp: entry.timestamp,
        fileName: entry.fileName,
      }
    })

    const roleCounts = new Map<string, number>()
    for (const entry of entries) {
      const role = entry.targetRole || 'Unspecified'
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1)
    }
    let mostCommonRole = ''
    let maxCount = 0
    for (const [role, count] of roleCounts) {
      if (count > maxCount) {
        maxCount = count
        mostCommonRole = role
      }
    }

    const allSkills = new Set<string>()
    for (const entry of entries) {
      for (const s of entry.skills) allSkills.add(s.toLowerCase())
      for (const s of entry.matchedSkills) allSkills.add(s.toLowerCase())
      for (const s of entry.missingSkills) allSkills.add(s.toLowerCase())
    }

    return {
      totalAnalyses: entries.length,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      bestScore: Math.max(...scores),
      worstScore: Math.min(...scores),
      scoreRange: Math.max(...scores) - Math.min(...scores),
      trendPoints,
      skillFrequencies: computeSkillFrequencies(entries),
      roleBreakdowns: computeRoleBreakdowns(entries),
      improvements: computeImprovements(entries),
      uniqueSkills: allSkills.size,
      mostCommonRole,
    }
  }, [entries])
}
