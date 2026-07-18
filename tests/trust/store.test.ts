import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, expect, test, vi } from 'vitest'
import type { ValidationResult } from '@/lib/validator/types'

let databaseFile: string | undefined

afterEach(async () => {
  vi.resetModules()
  delete process.env.DATABASE_URL
  if (databaseFile) await rm(databaseFile, { force: true }).catch(() => {})
  databaseFile = undefined
})

function makeGitHubResult(): ValidationResult {
  return {
    id: randomUUID(),
    timestamp: '2026-07-18T00:00:00.000Z',
    skillName: 'reviewer',
    overallScore: 88,
    riskLevel: 'low',
    summary: { totalChecks: 11, passed: 11, warnings: 0, failed: 0, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
    axes: [],
    findings: [],
    compatibility: { agents: [], overallCompatibility: 100 },
    tokenAnalysis: { totalTokens: 10, frontmatterTokens: 2, bodyTokens: 8, isUnderLimit: true, limit: 5000, breakdown: [] },
    skillPreview: { frontmatter: { name: 'reviewer' }, body: '# Reviewer', fileTree: [] },
    source: {
      type: 'github',
      owner: 'OpenAI',
      repo: 'skills',
      path: '/skills/reviewer/',
      sha: '0123456789012345678901234567890123456789',
      repositoryMeta: { fullName: 'OpenAI/skills', isPrivate: false, stars: 1, forks: 0, openIssues: 0, archived: false, isDefaultBranchHead: true },
    },
  }
}

test('GitHub scans are durable and resolve through their canonical source path', async () => {
  databaseFile = join(tmpdir(), `skillshield-trust-${randomUUID()}.db`)
  process.env.DATABASE_URL = `file:${databaseFile}`

  const { getLatestGitHubResult, saveResult } = await import('@/lib/store')
  const { getDatabase } = await import('@/lib/db')
  const { client } = getDatabase()
  const result = makeGitHubResult()

  await saveResult(result)

  expect(await getLatestGitHubResult('openai', 'SKILLS', 'skills/reviewer')).toEqual(result)
  const stored = await client.execute({ sql: 'SELECT expires_at FROM validation_results WHERE id = ?', args: [result.id] })
  expect(stored.rows[0]?.expires_at).toBeNull()

  client.close()
})
