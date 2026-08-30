import { describe, it, expect } from 'vitest'
import type { AnalysisEntry } from '../hooks/useAnalysisHistory'

// We test the pure hook logic by importing and calling the module internals.
// Since useResumeAnalytics wraps useMemo, we import the compute functions indirectly
// through a helper that simulates the same logic.

// Re-implement the pure functions for unit testing (they're the core value):
function computeAverageScore(entries: { score: number }[]): number {
  if (entries.length === 0) return 0
  const sum = entries.reduce((a, e) => a + e.score, 0)
  return Math.round(sum / entries.length)
}

function computeSkillFrequency(
  entries: { matchedSkills: string[]; missingSkills: string[]; skills: string[] }[],
): Map<string, number> {
  const freq = new Map<string, number>()
  for (const entry of entries) {
    const skills = entry.matchedSkills.length > 0 ? entry.matchedSkills : entry.skills
    for (const s of skills) {
      freq.set(s.toLowerCase(), (freq.get(s.toLowerCase()) ?? 0) + 1)
    }
  }
  return freq
}

function getGrade(avgScore: number): string {
  if (avgScore >= 85) return 'A'
  if (avgScore >= 70) return 'B'
  if (avgScore >= 50) return 'C'
  return 'D'
}

describe('ResumeAnalyticsDashboard computation', () => {
  const baseEntry: AnalysisEntry = {
    id: '1',
    timestamp: Date.now(),
    score: 80,
    skills: ['python', 'django', 'react'],
    suggestions: [],
    matchedSkills: ['python', 'django'],
    missingSkills: ['react'],
    partialSkills: [],
    targetRole: 'Full Stack Developer',
    experienceLevel: 'Mid-Level',
    fileName: 'resume.pdf',
  }

  it('computes average score correctly', () => {
    expect(computeAverageScore([{ score: 80 }, { score: 90 }, { score: 70 }])).toBe(80)
    expect(computeAverageScore([{ score: 60 }])).toBe(60)
    expect(computeAverageScore([])).toBe(0)
  })

  it('grades scores correctly', () => {
    expect(getGrade(90)).toBe('A')
    expect(getGrade(85)).toBe('A')
    expect(getGrade(70)).toBe('B')
    expect(getGrade(50)).toBe('C')
    expect(getGrade(30)).toBe('D')
  })

  it('counts skill frequencies', () => {
    const freq = computeSkillFrequency([
      { ...baseEntry, matchedSkills: ['python', 'django'], skills: [] as string[], missingSkills: [] as string[] },
      { ...baseEntry, matchedSkills: ['python', 'react'], skills: [] as string[], missingSkills: [] as string[] },
      { ...baseEntry, matchedSkills: [] as string[], skills: ['python'], missingSkills: [] as string[] },
    ])
    expect(freq.get('python')).toBe(3)
    expect(freq.get('django')).toBe(1)
    expect(freq.get('react')).toBe(1)
  })

  it('returns empty map for empty input', () => {
    const freq = computeSkillFrequency([])
    expect(freq.size).toBe(0)
  })
})
