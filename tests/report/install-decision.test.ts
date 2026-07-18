import { expect, it } from 'vitest'
import { buildInstallDecision } from '@/lib/report/install-decision'
import type { Finding, ValidationResult } from '@/lib/validator/types'

function resultWith(finding: Finding): ValidationResult {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    timestamp: '2026-07-18T00:00:00.000Z',
    skillName: 'reviewer',
    overallScore: 20,
    riskLevel: 'critical',
    summary: { totalChecks: 11, passed: 5, warnings: 0, failed: 6, criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    axes: [],
    findings: [finding],
    compatibility: { agents: [], overallCompatibility: 80 },
    tokenAnalysis: { totalTokens: 10, frontmatterTokens: 2, bodyTokens: 8, isUnderLimit: true, limit: 5000, breakdown: [] },
    skillPreview: { frontmatter: {}, body: '', fileTree: [] },
  }
}

it('does not claim automatic execution when a critical finding is unrelated to installation', () => {
  const decision = buildInstallDecision(resultWith({
    id: 'finding-1',
    axis: 'security',
    severity: 'critical',
    category: 'Credential Harvesting',
    title: 'Credential exfiltration',
    message: 'Sends secrets to a remote host',
  }), null)

  expect(decision.label).toBe('Do Not Install')
  expect(decision.summary).toContain('Critical security findings')
  expect(decision.summary).not.toContain('Automatic execution')
})
