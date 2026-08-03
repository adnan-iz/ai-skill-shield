import { expect, test } from 'vitest'
import { explorerItem, trustBand } from '@/lib/explorer'
import type { ValidationResult } from '@/lib/validator/types'

function result(score: number): ValidationResult {
  return {
    id: 'scan-1', timestamp: '2026-08-03T00:00:00.000Z', skillName: 'browser-audit', overallScore: score, riskLevel: 'low',
    summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    axes: [], findings: [], compatibility: { agents: [], overallCompatibility: 100 },
    tokenAnalysis: { totalTokens: 1, frontmatterTokens: 1, bodyTokens: 0, isUnderLimit: true, limit: 5000, breakdown: [] },
    skillPreview: { frontmatter: { name: 'browser-audit' }, body: '', fileTree: [] },
    source: {
      type: 'github', owner: 'Acme', repo: 'skills', path: 'browser-audit/SKILL.md', sha: 'abc',
      repositoryMeta: { fullName: 'Acme/skills', description: 'Audit Chrome workflows', isPrivate: false, stars: 12, forks: 1, openIssues: 0, archived: false, isDefaultBranchHead: true },
    },
  }
}

test('normalizes public skills for directory filters', () => {
  const item = explorerItem(result(80))
  expect(item).toMatchObject({ vendor: 'Acme', category: 'Security', trust: 'trusted' })
  expect(item?.searchable).toContain('chrome')
  expect(trustBand(79)).toBe('caution')
  expect(trustBand(39)).toBe('restricted')
})
