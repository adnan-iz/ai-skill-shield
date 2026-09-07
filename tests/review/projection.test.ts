import { expect, test } from 'vitest'
import { findingKey } from '@/lib/review/finding-key'
import { projectEffectiveResult } from '@/lib/review/projection'
import type { Finding, ValidationResult } from '@/lib/validator/types'

function finding(id: string, severity: Finding['severity'], axis: string, category = 'General'): Finding {
  return {
    id,
    axis,
    severity,
    category,
    title: `${severity} ${axis} finding`,
    message: `${severity} evidence`,
    filePath: 'SKILL.md',
    lineNumber: id === 'critical-id' ? 4 : 12,
  }
}

function originalResult(): ValidationResult {
  const critical = finding('critical-id', 'critical', 'security', 'Credential Harvesting')
  const high = finding('high-id', 'high', 'installation', 'Install Script')
  return {
    id: '00000000-0000-4000-8000-000000000001',
    timestamp: '2026-09-05T00:00:00.000Z',
    skillName: 'reviewer',
    overallScore: 42,
    riskLevel: 'critical',
    summary: {
      totalChecks: 2, passed: 0, warnings: 1, failed: 1,
      criticalCount: 1, highCount: 1, mediumCount: 0, lowCount: 0, infoCount: 0,
    },
    axes: [
      { name: 'Security', key: 'security', score: 25, status: 'fail', summary: 'Security finding', findings: [critical] },
      { name: 'Installation', key: 'installation', score: 60, status: 'warn', summary: 'Install finding', findings: [high] },
    ],
    findings: [critical, high],
    compatibility: { agents: [], overallCompatibility: 100 },
    tokenAnalysis: { totalTokens: 1, frontmatterTokens: 0, bodyTokens: 1, isUnderLimit: true, limit: 100, breakdown: [] },
    skillPreview: { frontmatter: {}, body: '', fileTree: [] },
  }
}

test('projects approved finding changes without changing numerical scores', () => {
  const original = originalResult()
  const criticalKey = findingKey(original.id, original.findings[0])
  const highKey = findingKey(original.id, original.findings[1])

  const projected = projectEffectiveResult(original, [
    { findingKey: criticalKey, decision: 'false_positive', approvalStatus: 'approved' },
    { findingKey: highKey, decision: 'severity_reduced', proposedSeverity: 'medium', approvalStatus: 'approved' },
  ])

  expect(projected.result.findings.map((item) => item.id)).not.toContain('critical-id')
  expect(projected.result.findings).toEqual([expect.objectContaining({ id: 'high-id', severity: 'medium' })])
  expect(projected.result.axes[0].findings).toEqual([])
  expect(projected.result.axes[1].findings).toEqual([expect.objectContaining({ id: 'high-id', severity: 'medium' })])
  expect(projected.result.riskLevel).toBe('medium')
  expect(projected.result.summary).toMatchObject({ criticalCount: 0, highCount: 0, mediumCount: 1 })
  expect(projected.result.overallScore).toBe(original.overallScore)
  expect(projected.result.axes.map((axis) => axis.score)).toEqual(original.axes.map((axis) => axis.score))
  expect(projected.installDecision.label).toBe('Safe to Review')
  expect(projected.installDecision.checklist.find((item) => item.label === 'Human review')).toMatchObject({
    status: 'neutral',
    detail: expect.stringContaining('completed'),
  })
  expect(original.findings).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'critical-id', severity: 'critical' }),
    expect.objectContaining({ id: 'high-id', severity: 'high' }),
  ]))
})

test('does not apply pending or rejected proposals', () => {
  const original = originalResult()
  const criticalKey = findingKey(original.id, original.findings[0])
  const highKey = findingKey(original.id, original.findings[1])

  const projected = projectEffectiveResult(original, [
    { findingKey: criticalKey, decision: 'false_positive', approvalStatus: 'pending' },
    { findingKey: highKey, decision: 'severity_reduced', proposedSeverity: 'low', approvalStatus: 'rejected' },
  ])

  expect(projected.result).toEqual(original)
  expect(projected.result).not.toBe(original)
  expect(projected.installDecision.label).toBe('Do Not Install')
  expect(projected.installDecision.checklist.find((item) => item.label === 'Human review')?.detail).not.toContain('No human review')
})

test('rejects an approved severity change without its replacement severity', () => {
  const original = originalResult()
  expect(() => projectEffectiveResult(original, [{
    findingKey: findingKey(original.id, original.findings[1]),
    decision: 'severity_reduced',
    approvalStatus: 'approved',
  }])).toThrow('proposed severity')
})
