import { expect, test } from 'vitest'
import { explorerItem, trustBand } from '@/lib/explorer'
import type { ValidationResult } from '@/lib/validator/types'

function result(score: number, riskLevel: ValidationResult['riskLevel'] = 'low'): ValidationResult {
  return {
    id: 'scan-1', timestamp: '2026-08-03T00:00:00.000Z', skillName: 'browser-audit', overallScore: score, riskLevel,
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
  expect(trustBand(79, 'low')).toBe('caution')
  expect(trustBand(39, 'low')).toBe('restricted')
  expect(trustBand(90, 'high')).toBe('caution')
  expect(trustBand(90, 'critical')).toBe('restricted')
})

test('constructs ExplorerMetaItem from ExplorerMetaRow', async () => {
  const { explorerItemFromMeta } = await import('@/lib/explorer')
  const metaItem = explorerItemFromMeta({
    id: 'res-1',
    sourceOwner: 'acme',
    sourceRepo: 'agent-tools',
    sourcePath: 'skills/deploy',
    sourceType: 'github',
    skillName: 'deploy-agent',
    overallScore: 85,
    riskLevel: 'low',
    findingsCount: 2,
    category: 'DevOps',
    description: 'Deploy skills easily',
    searchable: 'acme agent-tools skills/deploy deploy-agent devops deploy skills easily',
  })

  expect(metaItem).not.toBeNull()
  expect(metaItem).toMatchObject({
    resultId: 'res-1',
    owner: 'acme',
    repo: 'agent-tools',
    vendor: 'acme',
    skillName: 'deploy-agent',
    overallScore: 85,
    category: 'DevOps',
    trust: 'trusted',
  })
})

test('rejects non-github or incomplete meta rows', async () => {
  const { explorerItemFromMeta } = await import('@/lib/explorer')
  expect(explorerItemFromMeta({
    id: 'res-2',
    sourceOwner: null,
    sourceRepo: 'repo',
    sourcePath: '',
    sourceType: 'github',
    skillName: 'skill',
    overallScore: 90,
    riskLevel: 'low',
    findingsCount: 0,
    category: 'Security',
    description: '',
    searchable: '',
  })).toBeNull()

  expect(explorerItemFromMeta({
    id: 'res-3',
    sourceOwner: 'owner',
    sourceRepo: 'repo',
    sourcePath: '',
    sourceType: 'local',
    skillName: 'skill',
    overallScore: 90,
    riskLevel: 'low',
    findingsCount: 0,
    category: 'Security',
    description: '',
    searchable: '',
  })).toBeNull()
})
