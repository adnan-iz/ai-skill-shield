import { expect, it } from 'vitest'
import { normalizeValidationResult } from '@/lib/validator/normalize-result'
import type { ValidationResult } from '@/lib/validator/types'

it('repairs legacy broad compatibility and duplicate example findings on read', () => {
  const exampleFindings = [
    { id: 'a', axis: 'quality', severity: 'medium' as const, category: 'quality', title: 'Missing examples', message: 'missing', ruleId: 'quality-completeness-examples', lineNumber: 0 },
    { id: 'b', axis: 'quality', severity: 'medium' as const, category: 'quality', title: 'No code examples', message: 'missing', ruleId: 'quality-examples-none', lineNumber: 0 },
  ]
  const result = {
    id: 'test', timestamp: '', skillName: 'test', overallScore: 80, riskLevel: 'medium' as const,
    summary: { totalChecks: 11, passed: 1, warnings: 1, failed: 1, criticalCount: 0, highCount: 0, mediumCount: 2, lowCount: 0, infoCount: 0 },
    axes: [{ name: 'Content Quality', key: 'quality', score: 50, status: 'warn' as const, summary: 'old', findings: exampleFindings }, { name: 'Agent Compatibility', key: 'compatibility', score: 80, status: 'pass' as const, summary: 'Compatible with 23/23 agents', findings: [] }],
    findings: exampleFindings,
    compatibility: { agents: [{ id: 'claude-code', name: 'Claude Code', status: 'partial' as const, notes: 'Standard Agent Skills format; runtime-specific behavior not verified' }], overallCompatibility: 50 },
    tokenAnalysis: { totalTokens: 0, frontmatterTokens: 0, bodyTokens: 0, isUnderLimit: true, limit: 1, breakdown: [] },
    skillPreview: { frontmatter: {}, body: '', fileTree: [] },
  } satisfies ValidationResult

  const normalized = normalizeValidationResult(result)
  expect(normalized.findings.map((finding) => finding.title)).toEqual(['No usage examples'])
  expect(normalized.findings[0].lineNumber).toBeUndefined()
  expect(normalized.compatibility.agents[0].status).toBe('unknown')
  expect(normalized.axes.find((axis) => axis.key === 'compatibility')?.summary).toContain('No agent-specific')
})
