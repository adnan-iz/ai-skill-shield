import { AxisResult, Finding, TokenAnalysis, TokenBreakdownItem } from '@/lib/validator/types'

const TOKEN_LIMIT = 5000
const CHARS_PER_TOKEN = 4

let findingCounter = 0

function makeId(): string {
  return `tk-${Date.now()}-${++findingCounter}`
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

function extractSections(markdown: string): { heading: string; content: string }[] {
  const sections: { heading: string; content: string }[] = []
  const lines = markdown.split('\n')
  let currentHeading = '(root)'
  let currentContent: string[] = []

  for (const line of lines) {
    const headingMatch = line.match(/^#{1,6}\s+(.+)/)
    if (headingMatch) {
      if (currentContent.length > 0 || sections.length > 0) {
        sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
      }
      currentHeading = headingMatch[1].trim()
      currentContent = []
    } else {
      currentContent.push(line)
    }
  }

  if (currentContent.length > 0 || sections.length === 0) {
    sections.push({ heading: currentHeading, content: currentContent.join('\n').trim() })
  }

  return sections
}

export function analyzeTokens(
  content: string,
  frontmatter: Record<string, unknown>,
  body: string
): TokenAnalysis {
  const frontmatterStr = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')

  const frontmatterTokens = estimateTokens(frontmatterStr)
  const bodyTokens = estimateTokens(body || content)
  const total = frontmatterTokens + bodyTokens

  const sections = extractSections(body || content)
  const _totalSectionTokens = sections.reduce((sum, s) => sum + estimateTokens(s.content), 0) || 1

  const breakdown: TokenBreakdownItem[] = sections.map(s => ({
    section: s.heading,
    tokens: estimateTokens(s.content),
  }))

  return {
    totalTokens: total,
    frontmatterTokens,
    bodyTokens,
    isUnderLimit: total <= TOKEN_LIMIT,
    limit: TOKEN_LIMIT,
    breakdown,
  }
}

export function validateTokens(
  content: string,
  frontmatter: Record<string, unknown>,
  body: string
): AxisResult {
  const analysis = analyzeTokens(content, frontmatter, body)
  const findings: Finding[] = []

  if (!analysis.isUnderLimit) {
    findings.push({
      id: makeId(),
      axis: 'tokens',
      severity: 'low',
      category: 'tokens',
      title: 'Token limit exceeded',
      message: `Total tokens ${analysis.totalTokens} exceeds limit of ${TOKEN_LIMIT}`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Split the skill documentation: keep core content in SKILL.md and move detailed reference material to references/ directory',
      ruleId: 'tokens-limit-exceeded',
    })
  }

  const frontmatterPercentage = analysis.totalTokens > 0 ? (analysis.frontmatterTokens / analysis.totalTokens) * 100 : 0
  if (frontmatterPercentage > 30) {
    findings.push({
      id: makeId(),
      axis: 'tokens',
      severity: 'low',
      category: 'tokens',
      title: 'Large frontmatter',
      message: `Frontmatter uses ${analysis.frontmatterTokens} tokens (${frontmatterPercentage.toFixed(0)}% of total)`,
      filePath: 'SKILL.md',
      lineNumber: 0,
      column: 0,
      snippet: '',
      recommendation: 'Reduce frontmatter size by removing non-essential metadata',
      ruleId: 'tokens-large-frontmatter',
    })
  }

  for (const section of analysis.breakdown) {
    if (section.tokens > 1000) {
      findings.push({
        id: makeId(),
        axis: 'tokens',
        severity: 'low',
        category: 'tokens',
        title: 'Large section',
        message: `Section "${section.section}" has ${section.tokens} tokens, consider breaking it up`,
        filePath: 'SKILL.md',
        lineNumber: 0,
        column: 0,
        snippet: section.section,
        recommendation: `Split the "${section.section}" section into smaller subsections or move detailed content to references/`,
        ruleId: 'tokens-large-section',
      })
    }
  }

  const score = analysis.isUnderLimit
    ? (findings.length <= 1 ? 100 : 70)
    : 30

  return {
    name: 'Token Usage',
    key: 'tokens',
    score,
    status: score >= 90 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    summary: analysis.isUnderLimit
      ? `${analysis.totalTokens}/${TOKEN_LIMIT} tokens used${findings.length > 0 ? `, ${findings.length} issue${findings.length > 1 ? 's' : ''}` : ''}`
      : `Token limit exceeded: ${analysis.totalTokens}/${TOKEN_LIMIT}`,
    findings,
  }
}
