import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { gunzipSync } from 'node:zlib'
import { afterEach, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
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

test('GitHub scans are compressed, durable, and backward compatible', async () => {
  databaseFile = join(tmpdir(), `skillshield-trust-${randomUUID()}.db`)
  process.env.DATABASE_URL = `file:${databaseFile}`

  const { getLatestGitHubResult, getResult, saveResult } = await import('@/lib/store')
  const { getDatabase } = await import('@/lib/db')
  const { client } = getDatabase()
  const result = makeGitHubResult()
  result.batch = { totalSkills: 1, results: [] }

  await saveResult(result)

  expect(await getLatestGitHubResult('openai', 'SKILLS', 'skills/reviewer')).toEqual(result)
  const stored = await client.execute({ sql: 'SELECT result, expires_at FROM validation_results WHERE id = ?', args: [result.id] })
  expect(stored.rows[0]?.expires_at).toBeNull()
  expect(String(stored.rows[0]?.result)).toMatch(/^gzip:/)

  const { GET } = await import('@/app/api/validate/route')
  const response = await GET(new NextRequest(`http://localhost/api/validate?id=${result.id}`, {
    headers: { 'Accept-Encoding': 'gzip' },
  }))
  expect(response.headers.get('Content-Encoding')).toBe('gzip')
  expect(JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8'))).toEqual(result)

  const legacy = makeGitHubResult()
  await client.execute({
    sql: 'INSERT INTO validation_results (id, result, created_at, expires_at) VALUES (?, ?, ?, ?)',
    args: [legacy.id, JSON.stringify(legacy), Date.now(), null],
  })
  expect(await getResult(legacy.id)).toEqual(legacy)

  client.close()
})
