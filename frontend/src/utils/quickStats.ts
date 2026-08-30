/**
 * Quick Stats — compute compact resume-quality metrics from analysis results.
 *
 * Every metric is derived purely client-side from data the backend already
 * returns, so no new API surface is needed.
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface QuickStat {
  /** Unique key for React lists. */
  key: string
  /** Emoji icon. */
  icon: string
  /** Short label shown below the value. */
  label: string
  /** Primary numeric or text value. */
  value: string | number
  /** Optional secondary text (unit or detail). */
  detail?: string
  /** 0–100 progress value; `null` means no bar. */
  progress: number | null
  /** Colour hex for the progress bar fill. */
  color: string
  /** Optional tooltip / aria description. */
  tooltip?: string
}

// ── Constants ────────────────────────────────────────────────────────────────

const WORDS_PER_MINUTE = 200
const CHARS_PER_WORD = 5

/** Common action verbs that start strong bullet points. */
const ACTION_VERBS = new Set([
  'achieved', 'administered', 'analyzed', 'architected', 'automated',
  'built', 'collaborated', 'consolidated', 'constructed', 'coordinated',
  'created', 'debugged', 'delivered', 'deployed', 'designed',
  'developed', 'drove', 'eliminated', 'engineered', 'established',
  'executed', 'expanded', 'facilitated', 'generated', 'grew',
  'guided', 'implemented', 'improved', 'increased', 'influenced',
  'initiated', 'integrated', 'introduced', 'invented', 'launched',
  'led', 'leveraged', 'maintained', 'managed', 'mentored',
  'migrated', 'modernized', 'negotiated', 'optimized', 'orchestrated',
  'overhauled', 'oversaw', 'participated', 'perfected', 'performed',
  'pioneered', 'planned', 'prioritized', 'produced', 'programmed',
  'proposed', 'reduced', 'refactored', 'relocated', 'resolved',
  'revamped', 'scaled', 'simplified', 'spearheaded', 'standardized',
  'streamlined', 'strengthened', 'supervised', 'supported', 'transformed',
  'troubleshot', 'unified', 'upgraded', 'utilized',
])

/** Section headings commonly found in resumes. */
const SECTION_PATTERNS = [
  /(?:^|\n)\s*(?:professional\s+)?experience\b/i,
  /(?:^|\n)\s*work\s+history\b/i,
  /(?:^|\n)\s*education\b/i,
  /(?:^|\n)\s*skills?\b/i,
  /(?:^|\n)\s*projects?\b/i,
  /(?:^|\n)\s*certifications?\b/i,
  /(?:^|\n)\s*summary\b/i,
  /(?:^|\n)\s*objective\b/i,
  /(?:^|\n)\s*awards?\b/i,
  /(?:^|\n)\s*publications?\b/i,
  /(?:^|\n)\s*volunteer(?:ing)?\b/i,
  /(?:^|\n)\s*references?\b/i,
  /(?:^|\n)\s*interests?\b/i,
  /(?:^|\n)\s*languages?\s+known\b/i,
  /(?:^|\n)\s*technical\s+skills?\b/i,
]

// ── Pure helpers (exported for testing) ──────────────────────────────────────

/** Count words in a string. */
export function countWords(text: string): number {
  if (!text?.trim()) return 0
  return text.trim().split(/\s+/).length
}

/** Estimated reading time in minutes. */
export function readingTimeMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
}

/**
 * Skill density: skills per 100 words. Capped at 20 to avoid extreme
 * values for very short resumes.
 */
export function skillDensity(skills: string[], wordCount: number): number {
  if (wordCount <= 0) return 0
  const raw = (skills.length / wordCount) * 100
  return Math.round(Math.min(raw, 20) * 10) / 10
}

/**
 * Domain coverage: percentage of skill domains (0–10) that have at
 * least one detected skill. Uses a simplified inline mapping rather
 * than importing the full skillsRadar module to keep the feature
 * self-contained.
 */
export function domainCoverage(skills: string[]): number {
  const domainKeywords: Record<string, string[]> = {
    frontend: ['react', 'vue', 'angular', 'svelte', 'html', 'css', 'javascript', 'typescript', 'next.js', 'tailwind'],
    backend: ['django', 'flask', 'fastapi', 'express', 'spring', 'rails', 'node.js', 'go', 'rust', 'java', 'php'],
    database: ['sql', 'postgres', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'firebase'],
    devops: ['docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'ci/cd', 'jenkins', 'github actions'],
    cloud: ['aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify', 'cloudflare'],
    aiml: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'llm', 'openai', 'data science'],
    testing: ['jest', 'pytest', 'cypress', 'playwright', 'selenium', 'junit', 'testing', 'tdd'],
    tools: ['git', 'linux', 'bash', 'vscode', 'jira', 'agile', 'scrum', 'npm', 'yarn'],
    languages: ['python', 'javascript', 'typescript', 'java', 'c++', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin'],
    soft: ['leadership', 'communication', 'teamwork', 'mentoring', 'collaboration', 'problem solving'],
  }

  const lowerSkills = skills.map((s) => s.toLowerCase())
  let covered = 0
  const total = Object.keys(domainKeywords).length

  for (const keywords of Object.values(domainKeywords)) {
    const hasMatch = lowerSkills.some((skill) =>
      keywords.some((kw) => skill.includes(kw) || kw.includes(skill)),
    )
    if (hasMatch) covered++
  }

  return Math.round((covered / total) * 100)
}

/**
 * Count distinct resume sections detected in the raw text.
 */
export function countSections(resumeText: string): number {
  if (!resumeText?.trim()) return 0
  let count = 0
  for (const pattern of SECTION_PATTERNS) {
    if (pattern.test(resumeText)) count++
  }
  return count
}

/**
 * Action-verb ratio: fraction of bullet-like lines starting with an
 * action verb (0–1).
 */
export function actionVerbRatio(resumeText: string): number {
  if (!resumeText?.trim()) return 0

  // Lines starting with a bullet marker or hyphen
  const bullets = resumeText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[•\-\*\u2022\u25CF\u25CB\u2023\u25AA\u25AB]/.test(l))

  if (bullets.length === 0) return 0

  let verbCount = 0
  for (const bullet of bullets) {
    // Strip the bullet marker and leading whitespace, then check the first word
    const cleaned = bullet.replace(/^[•\-\*\u2022\u25CF\u25CB\u2023\u25AA\u25AB\s]+/, '')
    const firstWord = cleaned.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, '') ?? ''
    if (ACTION_VERBS.has(firstWord)) verbCount++
  }

  return Math.round((verbCount / bullets.length) * 100)
}

/**
 * Quantification score: percentage of bullet lines containing at least
 * one digit (numbers, percentages, dollar amounts, etc.) (0–100).
 */
export function quantificationScore(resumeText: string): number {
  if (!resumeText?.trim()) return 0

  const bullets = resumeText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^[•\-\*\u2022\u25CF\u25CB\u2023\u25AA\u25AB]/.test(l))

  if (bullets.length === 0) return 0

  let quantified = 0
  for (const bullet of bullets) {
    if (/\d/.test(bullet)) quantified++
  }

  return Math.round((quantified / bullets.length) * 100)
}

/**
 * ATS readiness: composite score from multiple signals.
 *
 * Weights:
 * - Skills found ≥ 5         → 25 pts
 * - Domain coverage ≥ 40 %   → 20 pts
 * - Sections detected ≥ 4    → 20 pts
 * - Action-verb ratio ≥ 50 % → 15 pts
 * - Quantification ≥ 30 %    → 10 pts
 * - Word count 200–800        → 10 pts
 */
export function atsReadiness(opts: {
  skillCount: number
  coverage: number
  sections: number
  verbRatio: number
  quantRatio: number
  wordCount: number
}): number {
  let score = 0
  if (opts.skillCount >= 5) score += 25
  if (opts.coverage >= 40) score += 20
  if (opts.sections >= 4) score += 20
  if (opts.verbRatio >= 50) score += 15
  if (opts.quantRatio >= 30) score += 10
  if (opts.wordCount >= 200 && opts.wordCount <= 800) score += 10
  return score
}

// ── Main builder ─────────────────────────────────────────────────────────────

export interface QuickStatsInput {
  resumeText: string
  skills: string[]
  suggestions: string[]
}

/**
 * Build the full array of QuickStat cards from the analysis payload.
 */
export function buildQuickStats(input: QuickStatsInput): QuickStat[] {
  const { resumeText, skills, suggestions } = input

  const words = countWords(resumeText)
  const readMin = readingTimeMinutes(words)
  const density = skillDensity(skills, words)
  const coverage = domainCoverage(skills)
  const sections = countSections(resumeText)
  const verbRatio = actionVerbRatio(resumeText)
  const quantRatio = quantificationScore(resumeText)
  const atsScore = atsReadiness({
    skillCount: skills.length,
    coverage,
    sections,
    verbRatio,
    quantRatio,
    wordCount: words,
  })

  return [
    {
      key: 'wordCount',
      icon: '📝',
      label: 'Word Count',
      value: words.toLocaleString(),
      detail: words > 0 ? `${readMin} min read` : undefined,
      progress: null,
      color: '#6366f1',
      tooltip: 'Total word count of the extracted resume text.',
    },
    {
      key: 'skillCount',
      icon: '🧩',
      label: 'Skills Detected',
      value: skills.length,
      detail: `${density}/100w density`,
      progress: Math.min(100, skills.length * 5),
      color: '#22c55e',
      tooltip: 'Number of technical and soft skills extracted from the resume.',
    },
    {
      key: 'domainCoverage',
      icon: '🎯',
      label: 'Domain Coverage',
      value: `${coverage}%`,
      detail: `${Math.round(coverage / 10)}/10 domains`,
      progress: coverage,
      color: coverage >= 60 ? '#22c55e' : coverage >= 30 ? '#f59e0b' : '#ef4444',
      tooltip: 'Percentage of skill domains (Frontend, Backend, DevOps, etc.) represented.',
    },
    {
      key: 'sections',
      icon: '📑',
      label: 'Sections Found',
      value: sections,
      detail: sections >= 4 ? 'Well-structured' : 'Needs more',
      progress: Math.min(100, (sections / 8) * 100),
      color: sections >= 4 ? '#22c55e' : '#f59e0b',
      tooltip: 'Number of standard resume sections detected (Experience, Education, Skills, etc.).',
    },
    {
      key: 'actionVerbs',
      icon: '⚡',
      label: 'Action Verbs',
      value: `${verbRatio}%`,
      detail: verbRatio >= 50 ? 'Strong impact' : 'Weak bullets',
      progress: verbRatio,
      color: verbRatio >= 50 ? '#22c55e' : verbRatio >= 25 ? '#f59e0b' : '#ef4444',
      tooltip: 'Percentage of bullet points starting with a strong action verb.',
    },
    {
      key: 'quantification',
      icon: '📊',
      label: 'Quantification',
      value: `${quantRatio}%`,
      detail: quantRatio >= 30 ? 'Data-driven' : 'Needs metrics',
      progress: quantRatio,
      color: quantRatio >= 30 ? '#22c55e' : quantRatio >= 15 ? '#f59e0b' : '#ef4444',
      tooltip: 'Percentage of bullet points containing measurable data (numbers, %, $).',
    },
    {
      key: 'atsReadiness',
      icon: '🤖',
      label: 'ATS Readiness',
      value: `${atsScore}/100`,
      detail: atsScore >= 70 ? 'Excellent' : atsScore >= 40 ? 'Good' : 'Needs work',
      progress: atsScore,
      color: atsScore >= 70 ? '#22c55e' : atsScore >= 40 ? '#3b82f6' : '#ef4444',
      tooltip: 'Composite score estimating how well the resume passes ATS filters.',
    },
    {
      key: 'suggestions',
      icon: '💡',
      label: 'Suggestions',
      value: suggestions.length,
      detail: suggestions.length > 0 ? 'Action items' : 'Looking good!',
      progress: suggestions.length > 0 ? Math.min(100, suggestions.length * 15) : 100,
      color: suggestions.length === 0 ? '#22c55e' : '#a855f7',
      tooltip: 'Number of actionable improvement suggestions generated.',
    },
  ]
}
