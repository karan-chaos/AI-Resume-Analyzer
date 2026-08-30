import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QuickStats } from './QuickStats'
import {
  countWords,
  readingTimeMinutes,
  skillDensity,
  domainCoverage,
  countSections,
  actionVerbRatio,
  quantificationScore,
  atsReadiness,
  buildQuickStats,
} from '../utils/quickStats'

// ── countWords ───────────────────────────────────────────────────────────────

describe('countWords', () => {
  it('returns 0 for empty input', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })

  it('counts words correctly', () => {
    expect(countWords('hello world')).toBe(2)
    expect(countWords('one two three four five')).toBe(5)
  })

  it('handles multiple spaces and newlines', () => {
    expect(countWords('hello   world\ntest')).toBe(3)
  })
})

// ── readingTimeMinutes ───────────────────────────────────────────────────────

describe('readingTimeMinutes', () => {
  it('returns at least 1 minute', () => {
    expect(readingTimeMinutes(0)).toBe(1)
    expect(readingTimeMinutes(10)).toBe(1)
  })

  it('calculates correctly at 200 WPM', () => {
    expect(readingTimeMinutes(200)).toBe(1)
    expect(readingTimeMinutes(400)).toBe(2)
    expect(readingTimeMinutes(600)).toBe(3)
  })

  it('rounds up', () => {
    expect(readingTimeMinutes(201)).toBe(2)
    expect(readingTimeMinutes(399)).toBe(2)
  })
})

// ── skillDensity ─────────────────────────────────────────────────────────────

describe('skillDensity', () => {
  it('returns 0 when wordCount is 0', () => {
    expect(skillDensity(['a', 'b'], 0)).toBe(0)
  })

  it('calculates density per 100 words', () => {
    // 5 skills / 500 words = 1.0 per 100
    const skills = ['React', 'Docker', 'SQL', 'Python', 'AWS']
    expect(skillDensity(skills, 500)).toBe(1.0)
  })

  it('caps at 20', () => {
    const skills = Array.from({ length: 20 }, (_, i) => `skill${i}`)
    expect(skillDensity(skills, 100)).toBe(20)
  })
})

// ── domainCoverage ───────────────────────────────────────────────────────────

describe('domainCoverage', () => {
  it('returns 0 for empty skills', () => {
    expect(domainCoverage([])).toBe(0)
  })

  it('returns 100 when all 10 domains are covered', () => {
    const skills = [
      'React',       // frontend
      'Django',      // backend
      'PostgreSQL',  // database
      'Docker',      // devops
      'AWS',         // cloud
      'PyTorch',     // aiml
      'Jest',        // testing
      'Git',         // tools
      'Python',      // languages
      'Leadership',  // soft
    ]
    expect(domainCoverage(skills)).toBe(100)
  })

  it('returns proportional score', () => {
    const skills = ['React', 'Django', 'Docker', 'AWS'] // 4/10
    expect(domainCoverage(skills)).toBe(40)
  })
})

// ── countSections ────────────────────────────────────────────────────────────

describe('countSections', () => {
  it('returns 0 for empty text', () => {
    expect(countSections('')).toBe(0)
  })

  it('counts common resume sections', () => {
    const text = `
      Summary
      Experience
      Education
      Skills
      Projects
    `
    expect(countSections(text)).toBe(5)
  })

  it('is case-insensitive', () => {
    expect(countSections('EXPERIENCE\neducation\nSKILLS')).toBe(3)
  })
})

// ── actionVerbRatio ──────────────────────────────────────────────────────────

describe('actionVerbRatio', () => {
  it('returns 0 for empty text', () => {
    expect(actionVerbRatio('')).toBe(0)
  })

  it('returns 0 when no bullet points exist', () => {
    expect(actionVerbRatio('No bullets here')).toBe(0)
  })

  it('calculates correctly', () => {
    const text = [
      '- Built a React application',
      '- Designed the API layer',
      '- Managed the team',
      '- random text without verb',
    ].join('\n')
    // 3 out of 4 start with action verbs
    expect(actionVerbRatio(text)).toBe(75)
  })

  it('handles various bullet markers', () => {
    const text = [
      '• Achieved 99% uptime',
      '• Optimized query performance',
    ].join('\n')
    expect(actionVerbRatio(text)).toBe(100)
  })
})

// ── quantificationScore ──────────────────────────────────────────────────────

describe('quantificationScore', () => {
  it('returns 0 for empty text', () => {
    expect(quantificationScore('')).toBe(0)
  })

  it('detects numbers in bullets', () => {
    const text = [
      '- Improved speed by 50%',
      '- Handled 1000+ requests',
      '- No numbers here',
    ].join('\n')
    // 2 out of 3 contain digits
    expect(quantificationScore(text)).toBe(67)
  })
})

// ── atsReadiness ─────────────────────────────────────────────────────────────

describe('atsReadiness', () => {
  it('returns 0 for empty resume', () => {
    expect(atsReadiness({
      skillCount: 0, coverage: 0, sections: 0,
      verbRatio: 0, quantRatio: 0, wordCount: 0,
    })).toBe(0)
  })

  it('returns 100 for a perfect resume', () => {
    expect(atsReadiness({
      skillCount: 10, coverage: 80, sections: 6,
      verbRatio: 80, quantRatio: 60, wordCount: 500,
    })).toBe(100)
  })

  it('is additive', () => {
    // Only skillCount threshold met
    const partial = atsReadiness({
      skillCount: 5, coverage: 0, sections: 0,
      verbRatio: 0, quantRatio: 0, wordCount: 0,
    })
    expect(partial).toBe(25)
  })
})

// ── buildQuickStats ──────────────────────────────────────────────────────────

describe('buildQuickStats', () => {
  it('returns 8 stat cards', () => {
    const stats = buildQuickStats({
      resumeText: 'Experience\nReact developer',
      skills: ['React', 'JavaScript'],
      suggestions: ['Add Docker'],
    })
    expect(stats).toHaveLength(8)
  })

  it('each stat has a unique key', () => {
    const stats = buildQuickStats({
      resumeText: 'test',
      skills: ['React'],
      suggestions: [],
    })
    const keys = stats.map((s) => s.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

// ── Component render tests ───────────────────────────────────────────────────

describe('QuickStats', () => {
  it('renders nothing when no skills and no text', () => {
    const { container } = render(
      <QuickStats resumeText="" skills={[]} suggestions={[]} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders the toggle button', () => {
    render(
      <QuickStats resumeText="Some resume" skills={['React']} suggestions={[]} />,
    )
    expect(screen.getByText(/Quick Stats/)).toBeDefined()
  })

  it('expands and shows stat cards on click', () => {
    render(
      <QuickStats resumeText="Experience section here" skills={['React', 'Docker']} suggestions={['Add AWS']} />,
    )
    const toggle = screen.getByRole('button', { name: /Quick Stats/ })
    toggle.click()

    expect(screen.getByText('Word Count')).toBeDefined()
    expect(screen.getByText('Skills Detected')).toBeDefined()
    expect(screen.getByText('ATS Readiness')).toBeDefined()
  })
})
