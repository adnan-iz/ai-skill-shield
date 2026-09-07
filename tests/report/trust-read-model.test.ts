import { beforeEach, expect, it, vi } from 'vitest'
import { findingKey } from '@/lib/review/finding-key'
import type { Finding, ValidationResult } from '@/lib/validator/types'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/store', () => ({
  getLatestGitHubResult: vi.fn(),
  getResult: vi.fn(),
}))
vi.mock('@/lib/review/store', () => ({
  getAppliedProjection: vi.fn(),
}))
vi.mock('@/lib/db', () => ({
  ensureDatabase: vi.fn(),
  getDatabase: vi.fn(),
}))

const { getLatestGitHubResult, getResult } = await import('@/lib/store')
const { getAppliedProjection } = await import('@/lib/review/store')
const { getDatabase } = await import('@/lib/db')
const { getPublicTrustReadModel } = await import('@/lib/trust-server')

const challenged: Finding = {
  id: 'finding-1',
  axis: 'security',
  severity: 'critical',
  category: 'Dangerous command',
  title: 'Pipe to shell',
  message: 'A dangerous command was detected.',
  filePath: 'SKILL.md',
  lineNumber: 12,
}

function result(id: string, score = 90): ValidationResult {
  return {
    id,
    timestamp: '2026-09-05T00:00:00.000Z',
    skillName: 'reviewer',
    overallScore: score,
    riskLevel: 'critical',
    summary: { totalChecks: 1, passed: 0, warnings: 0, failed: 1, criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    axes: [{ name: 'Security', key: 'security', score: 10, status: 'fail', summary: 'Critical issue', findings: [challenged] }],
    findings: [challenged],
    compatibility: { agents: [], overallCompatibility: 100 },
    tokenAnalysis: { totalTokens: 1, frontmatterTokens: 0, bodyTokens: 1, isUnderLimit: true, limit: 100, breakdown: [] },
    skillPreview: { frontmatter: {}, body: '', fileTree: [] },
    source: {
      type: 'github', owner: 'pekral', repo: 'ai-olympus', path: '',
      sha: '0123456789012345678901234567890123456789',
      repositoryMeta: { fullName: 'pekral/ai-olympus', isPrivate: false, isDefaultBranchHead: true, stars: 1, forks: 0, openIssues: 1, archived: false },
    },
  }
}

beforeEach(() => {
  vi.mocked(getLatestGitHubResult).mockReset()
  vi.mocked(getResult).mockReset()
  vi.mocked(getAppliedProjection).mockReset()
  vi.mocked(getDatabase).mockReset()
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({ private: false })))
})

it('applies only a completed projection and keeps the immutable score', async () => {
  const original = result('22222222-2222-4222-8222-222222222222')
  const verified = { ...result('33333333-3333-4333-8333-333333333333', 96), findings: [], axes: [], riskLevel: 'safe' as const }
  const key = findingKey(original.id, challenged)
  vi.mocked(getLatestGitHubResult).mockResolvedValue(original)
  vi.mocked(getAppliedProjection).mockResolvedValue({
    reviewId: '11111111-1111-4111-8111-111111111111',
    scanId: original.id,
    effectiveFindingKeys: [],
    suppressedFindingKeys: [key],
    effectiveRiskLevel: 'safe',
    effectiveSummary: { ...original.summary, criticalCount: 0 },
    verifiedRescanId: verified.id,
  })
  vi.mocked(getResult).mockResolvedValue(verified)
  const query = vi.fn(async (sql: string) => sql.includes('FROM scan_reviews review')
    ? { rows: [{
      id: '11111111-1111-4111-8111-111111111111', scan_id: original.id, status: 'completed', owner: 'pekral', repo: 'ai-olympus', path: '',
      issue_number: 89, commit_sha: original.source!.sha!, original_score: 90, original_risk_level: 'critical', proposed_risk_level: 'safe',
      effective_risk_level: 'safe', verified_rescan_id: verified.id, created_at: 1_788_585_600_000, completed_at: 1_788_589_200_000,
      comment_id: 123,
    }] }
    : { rows: [{
      finding_key: key, decision: 'false_positive', original_severity: 'critical', proposed_severity: null,
      approval_status: 'approved', explanation: 'The command is documentation.',
      evidence: JSON.stringify([{ filePath: 'SKILL.md', lineStart: 12, lineEnd: 12, excerpt: 'curl example' }]),
    }] })
  vi.mocked(getDatabase).mockReturnValue({ client: { query } } as never)

  const readModel = await getPublicTrustReadModel('pekral', 'ai-olympus')

  expect(readModel?.original.overallScore).toBe(90)
  expect(readModel?.effective.overallScore).toBe(90)
  expect(readModel?.effective.findings).toEqual([])
  expect(readModel?.review).toMatchObject({
    status: 'completed', effectiveRiskLevel: 'safe', suppressedCount: 1,
    commentUrl: 'https://github.com/pekral/ai-olympus/issues/89#issuecomment-123',
  })
  expect(readModel?.verifiedRescan?.overallScore).toBe(96)
})

it('keeps a pending proposal out of the effective report', async () => {
  const original = result('44444444-4444-4444-8444-444444444444')
  vi.mocked(getLatestGitHubResult).mockResolvedValue(original)
  vi.mocked(getAppliedProjection).mockResolvedValue(null)
  const query = vi.fn(async (sql: string) => sql.includes('FROM scan_reviews review')
    ? { rows: [{
      id: '55555555-5555-4555-8555-555555555555', scan_id: original.id, status: 'awaiting_approval', owner: 'pekral', repo: 'ai-olympus', path: '',
      issue_number: 89, commit_sha: original.source!.sha!, original_score: 90, original_risk_level: 'critical', proposed_risk_level: 'medium',
      effective_risk_level: null, verified_rescan_id: null, created_at: 1_788_585_600_000, completed_at: 1_788_589_200_000, comment_id: 123,
    }] }
    : { rows: [{
      finding_key: findingKey(original.id, challenged), decision: 'severity_reduced', original_severity: 'critical', proposed_severity: 'medium',
      approval_status: 'pending', explanation: 'The command is an example.', evidence: '[]',
    }] })
  vi.mocked(getDatabase).mockReturnValue({ client: { query } } as never)

  const readModel = await getPublicTrustReadModel('pekral', 'ai-olympus')

  expect(readModel?.effective).toEqual(original)
  expect(readModel?.review).toMatchObject({
    status: 'awaiting_approval', effectiveRiskLevel: 'critical', proposedRiskLevel: 'medium', suppressedCount: 0, changedCount: 0,
  })
  expect(readModel?.verifiedRescan).toBeNull()
})
