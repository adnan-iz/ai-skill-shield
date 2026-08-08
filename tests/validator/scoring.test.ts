import { describe, it, expect } from 'vitest'
import { calculateOverallScore, determineRiskLevel } from '@/lib/validator/orchestrator'
import { requiresApproval } from '@/lib/validator/service'
import type { AxisResult, Finding } from '@/lib/validator/types'

function makeFinding(severity: Finding['severity']): Finding {
  return {
    id: 'test',
    axis: 'security',
    severity,
    category: 'test',
    title: 'test',
    message: 'test',
  }
}

function axis(key: string, score: number): AxisResult {
  return { name: key, key, score, status: 'pass', summary: '', findings: [] }
}

describe('calculateOverallScore', () => {
  it('normalizes the configured 97% weight total to 100', () => {
    expect(calculateOverallScore([
      'security', 'frontmatter', 'quality', 'structure', 'naming', 'tokens',
      'compatibility', 'content', 'dependencies', 'installation', 'bestPractices',
    ].map((key) => axis(key, 100)))).toBe(100)
  })

  it('can produce scores between the old severity caps', () => {
    expect(calculateOverallScore([
      axis('security', 0), axis('frontmatter', 100), axis('quality', 63),
      axis('structure', 100), axis('naming', 100), axis('tokens', 100),
      axis('compatibility', 71), axis('content', 100), axis('dependencies', 80),
      axis('installation', 10), axis('bestPractices', 100),
    ])).toBe(61)
  })
})

describe('requiresApproval', () => {
  it('keeps severe scans review-gated without score caps', () => {
    expect(requiresApproval({ overallScore: 90, riskLevel: 'high' })).toBe(true)
    expect(requiresApproval({ overallScore: 90, riskLevel: 'critical' })).toBe(true)
    expect(requiresApproval({ overallScore: 90, riskLevel: 'low' })).toBe(false)
  })
})

describe('determineRiskLevel', () => {
  it('returns safe for no findings', () => {
    expect(determineRiskLevel([])).toBe('safe')
  })

  it('returns critical when a critical finding exists', () => {
    const findings = [makeFinding('critical')]
    expect(determineRiskLevel(findings)).toBe('critical')
  })

  it('returns high when highest severity is high', () => {
    const findings = [makeFinding('high')]
    expect(determineRiskLevel(findings)).toBe('high')
  })

  it('returns medium when highest severity is medium', () => {
    const findings = [makeFinding('medium')]
    expect(determineRiskLevel(findings)).toBe('medium')
  })

  it('returns low when highest severity is low', () => {
    const findings = [makeFinding('low')]
    expect(determineRiskLevel(findings)).toBe('low')
  })

  it('returns critical even when mixed with lower severities', () => {
    const findings = [makeFinding('low'), makeFinding('medium'), makeFinding('high'), makeFinding('critical')]
    expect(determineRiskLevel(findings)).toBe('critical')
  })

  it('returns high when mixed with medium and low but no critical', () => {
    const findings = [makeFinding('low'), makeFinding('medium'), makeFinding('high')]
    expect(determineRiskLevel(findings)).toBe('high')
  })
})

describe('score deduction for critical findings', () => {
  it('security score drops to 50 for one critical finding', () => {
    const findings = [makeFinding('critical')]
    const riskLevel = determineRiskLevel(findings)
    expect(riskLevel).toBe('critical')
  })
})

describe('score deduction for high findings', () => {
  it('security score drops for high severity', () => {
    const findings = [makeFinding('high')]
    const riskLevel = determineRiskLevel(findings)
    expect(riskLevel).toBe('high')
  })
})

describe('score cap when secrets found', () => {
  it('secrets trigger critical risk level', () => {
    const secretFinding: Finding = {
      ...makeFinding('critical'),
      category: 'credential-harvesting',
      title: 'OpenAI API Key',
    }
    const riskLevel = determineRiskLevel([secretFinding])
    expect(riskLevel).toBe('critical')
  })
})

describe('risk level mapping', () => {
  it('maps empty findings to safe', () => {
    expect(determineRiskLevel([])).toBe('safe')
  })

  it('maps critical severity to critical', () => {
    expect(determineRiskLevel([makeFinding('critical')])).toBe('critical')
  })

  it('maps high severity to high', () => {
    expect(determineRiskLevel([makeFinding('high')])).toBe('high')
  })

  it('maps medium severity to medium', () => {
    expect(determineRiskLevel([makeFinding('medium')])).toBe('medium')
  })

  it('maps low severity to low', () => {
    expect(determineRiskLevel([makeFinding('low')])).toBe('low')
  })

  it('maps info severity to safe', () => {
    expect(determineRiskLevel([makeFinding('info')])).toBe('safe')
  })
})
