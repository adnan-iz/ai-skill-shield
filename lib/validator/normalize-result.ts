import type { AgentCompatibility, Finding, ValidationResult } from '@/lib/validator/types'

function normalizeFindings(findings: Finding[]): Finding[] {
  const hasNoExamples = findings.some((finding) => finding.ruleId === 'quality-examples-none')
  const seen = new Set<string>()

  return findings.flatMap((finding) => {
    if (hasNoExamples && (finding.ruleId === 'quality-completeness-examples' || finding.ruleId === 'quality-examples-io')) return []

    const normalized: Finding = {
      ...finding,
      ...(finding.lineNumber && finding.lineNumber > 0 ? {} : { lineNumber: undefined, column: undefined }),
      ...(finding.ruleId === 'quality-examples-none' ? {
        title: 'No usage examples',
        message: 'Skill documentation contains no examples or demonstrations',
        recommendation: 'Add a concrete usage example with an expected result',
      } : {}),
    }
    const key = `${normalized.ruleId || normalized.category}|${normalized.title}|${normalized.filePath || ''}|${normalized.lineNumber || ''}`
    if (seen.has(key)) return []
    seen.add(key)
    return [normalized]
  })
}

function normalizeAgent(agent: AgentCompatibility): AgentCompatibility {
  if (agent.status !== 'partial' || !agent.notes) return agent
  const evidence = agent.notes
    .split('; ')
    .filter((note) => note !== 'Standard Agent Skills format')
    .filter((note) => note !== 'runtime-specific behavior not verified')
    .filter((note) => note !== 'Uses allowed-tools (new spec, broad compatibility)')

  return evidence.length > 0
    ? { ...agent, notes: evidence.join('; ') }
    : { ...agent, status: 'unknown', notes: undefined }
}

function compatibilityScore(agents: AgentCompatibility[]): number {
  const fullCount = agents.filter((agent) => agent.status === 'full').length
  const partialCount = agents.filter((agent) => agent.status === 'partial').length
  if (fullCount >= 3) return 90
  if (fullCount >= 1) return 70 + Math.round((fullCount / agents.length) * 20)
  if (partialCount >= 3) return 50
  if (partialCount >= 1) return 30
  return 10
}

export function normalizeValidationResult(result: ValidationResult): ValidationResult {
  const findings = normalizeFindings(result.findings)
  const agents = result.compatibility.agents.map(normalizeAgent)
  const fullCount = agents.filter((agent) => agent.status === 'full').length
  const partialCount = agents.filter((agent) => agent.status === 'partial').length
  const unknownCount = agents.filter((agent) => agent.status === 'unknown').length
  const knownCount = fullCount + partialCount
  const compatibility = { agents, overallCompatibility: compatibilityScore(agents) }
  const axes = result.axes.map((axis) => {
    const axisFindings = normalizeFindings(axis.findings)
    if (axis.key === 'compatibility') {
      const score = knownCount > 0 ? compatibility.overallCompatibility : 0
      return {
        ...axis,
        score,
        status: score >= 70 ? 'pass' as const : score >= 40 ? 'warn' as const : 'fail' as const,
        summary: knownCount > 0
          ? `Explicit markers: ${fullCount} full, ${partialCount} partial; ${unknownCount} unverified`
          : 'No agent-specific runtime markers detected',
        findings: axisFindings,
      }
    }
    return {
      ...axis,
      findings: axisFindings,
      summary: axis.key === 'quality' && axis.score < 70
        ? `Quality score ${axis.score}/100, ${axisFindings.length} area${axisFindings.length === 1 ? '' : 's'} for improvement`
        : axis.summary,
    }
  })

  return {
    ...result,
    findings,
    axes,
    compatibility,
    summary: {
      ...result.summary,
      criticalCount: findings.filter((finding) => finding.severity === 'critical').length,
      highCount: findings.filter((finding) => finding.severity === 'high').length,
      mediumCount: findings.filter((finding) => finding.severity === 'medium').length,
      lowCount: findings.filter((finding) => finding.severity === 'low').length,
      infoCount: findings.filter((finding) => finding.severity === 'info').length,
    },
  }
}
