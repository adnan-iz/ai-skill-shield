import { expect, it } from 'vitest'
import { buildInstallDecision } from '@/lib/report/install-decision'
import type { RepositoryAuditFinding } from '@/lib/github/repository-audit'
import type { Finding, ValidationResult } from '@/lib/validator/types'

function baseResult(): ValidationResult {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    timestamp: '2026-07-18T00:00:00.000Z',
    skillName: 'reviewer',
    overallScore: 95,
    riskLevel: 'safe',
    summary: { totalChecks: 11, passed: 11, warnings: 0, failed: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    axes: [],
    findings: [],
    compatibility: { agents: [], overallCompatibility: 80 },
    tokenAnalysis: { totalTokens: 10, frontmatterTokens: 2, bodyTokens: 8, isUnderLimit: true, limit: 5000, breakdown: [] },
    skillPreview: { frontmatter: {}, body: '', fileTree: [] },
  }
}

function resultWith(finding: Finding): ValidationResult {
  return {
    ...baseResult(),
    overallScore: 20,
    riskLevel: 'critical',
    summary: { totalChecks: 11, passed: 5, warnings: 0, failed: 6, criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    findings: [finding],
  }
}

function resultWithRepoFinding(finding: RepositoryAuditFinding): ValidationResult {
  return {
    ...baseResult(),
    source: {
      type: 'github',
      repositoryAudit: {
        owner: 'example',
        repo: 'skill',
        branch: 'main',
        riskLevel: finding.severity === 'medium' ? 'medium' : 'low',
        summary: { totalFiles: 1, totalDirectories: 1, workflowCount: 1, packageManifestCount: 0, installScriptCount: 0, installSurfaceCount: 1, truncated: false },
        surfaces: [{ path: '.github/workflows/test.yml', kind: 'workflow', automatic: true }],
        findings: [finding],
      },
    },
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
  expect(decision.reasons[0]?.label).toBe('1 critical blocker detected')
})

it('treats a completed human review as context, not an installation override', () => {
  const decision = buildInstallDecision(resultWith({
    id: 'finding-2',
    axis: 'security',
    severity: 'critical',
    category: 'Credential Harvesting',
    title: 'Credential exfiltration',
    message: 'Sends secrets to a remote host',
  }), 'approved')

  expect(decision.label).toBe('Do Not Install')
  expect(decision.checklist.find((item) => item.label === 'Human review')?.status).toBe('neutral')
  expect(decision.checklist.find((item) => item.label === 'Human review')?.detail).toContain('never overrides')
})

it('requires manual review for contextual medium security signals', () => {
  const result = resultWith({
    id: 'finding-3',
    axis: 'security',
    severity: 'medium',
    category: 'staged-malware',
    title: 'Multiple download and execution references',
    message: 'Contextual review is required.',
  })
  result.riskLevel = 'medium'
  result.summary = { ...result.summary, criticalCount: 0, mediumCount: 1 }

  const decision = buildInstallDecision(result, null)
  expect(decision.label).toBe('Needs Manual Review')
  expect(decision.reasons[0]?.label).toBe('Contextual security signals need review')
})

it('keeps a low-severity workflow notice informational', () => {
  const decision = buildInstallDecision(resultWithRepoFinding({
    id: 'workflow:test',
    severity: 'low',
    category: 'GitHub Actions',
    title: 'GitHub Actions workflow can execute repository code',
    message: 'Review the workflow before trusting it.',
  }), null)

  expect(decision.label).toBe('Safe to Review')
  expect(decision.checklist.find((item) => item.label === 'Repository install surface checked')?.status).toBe('pass')
})

it('still requires review for a medium repository finding', () => {
  const decision = buildInstallDecision(resultWithRepoFinding({
    id: 'repository:medium',
    severity: 'medium',
    category: 'Repository',
    title: 'Repository risk needs review',
    message: 'Inspect this repository finding.',
  }), null)

  expect(decision.label).toBe('Needs Manual Review')
})

it('ignores legacy prepublish-only findings when deciding whether installation is blocked', () => {
  const result = resultWithRepoFinding({
    id: 'lifecycle:package-json:prepublishOnly',
    severity: 'critical',
    category: 'Install Script',
    title: 'Detected lifecycle script: prepublishOnly',
    message: 'Legacy finding from an earlier scanner version.',
  })
  result.source!.repositoryAudit!.riskLevel = 'critical'
  result.source!.repositoryAudit!.findings.push({
    id: 'lifecycle:package-json:prepare',
    severity: 'high',
    category: 'Install Script',
    title: 'Detected lifecycle script: prepare',
    message: 'Review this install-time hook.',
  })

  expect(buildInstallDecision(result, null).label).toBe('Needs Manual Review')
})
