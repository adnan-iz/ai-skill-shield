import { AxisResult, Finding } from '@/lib/validator/types'

let findingCounter = 0

function makeId(): string {
  return `fm-${Date.now()}-${++findingCounter}`
}

export function validateFrontmatter(frontmatter: Record<string, unknown>): AxisResult {
  const findings: Finding[] = []

  const requiredFields = ['name', 'description']
  for (const field of requiredFields) {
    if (!frontmatter[field] || String(frontmatter[field]).trim() === '') {
      findings.push({
        id: makeId(),
        axis: 'frontmatter',
        severity: 'high',
        category: 'frontmatter',
        title: `Missing required field: ${field}`,
        message: `Frontmatter is missing the required "${field}" field`,
        filePath: 'SKILL.md',
        lineNumber: 1,
        column: 0,
        snippet: '',
        recommendation: `Add "${field}" to the frontmatter section`,
        ruleId: 'frontmatter-required',
      })
    }
  }

  const allowedFields = new Set([
    ...requiredFields,
    'license', 'compatibility', 'metadata', 'allowed-tools',
  ])

  for (const key of Object.keys(frontmatter)) {
    if (!allowedFields.has(key)) {
      findings.push({
        id: makeId(),
        axis: 'frontmatter',
        severity: 'info',
        category: 'frontmatter',
        title: `Unknown field: ${key}`,
        message: `Frontmatter contains unknown field "${key}"`,
        filePath: 'SKILL.md',
        lineNumber: 1,
        column: 0,
        snippet: `"${key}": ${JSON.stringify(frontmatter[key]).substring(0, 80)}`,
        recommendation: `Remove "${key}" or check the spec for valid fields`,
        ruleId: 'frontmatter-unknown',
      })
    }
  }

  let score = 100
  for (const f of findings) {
    switch (f.severity) {
      case 'critical': score -= 40; break
      case 'high': score -= 20; break
      case 'medium': score -= 10; break
      case 'low': score -= 5; break
      case 'info': score -= 2; break
    }
  }
  score = Math.max(0, Math.min(100, score))

  return {
    name: 'Frontmatter Validation',
    key: 'frontmatter',
    score,
    status: score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    summary: findings.length === 0
      ? 'Frontmatter is valid and complete'
      : `${findings.length} frontmatter issue${findings.length > 1 ? 's' : ''} found`,
    findings,
  }
}
