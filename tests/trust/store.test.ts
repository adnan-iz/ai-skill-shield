import { randomUUID } from 'node:crypto'
import { gunzipSync } from 'node:zlib'
import { afterEach, expect, test, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ValidationResult } from '@/lib/validator/types'
import { normalizeValidationResult } from '@/lib/validator/normalize-result'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

afterEach(async () => {
  vi.resetModules()
  delete process.env.DATABASE_URL
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

test.skipIf(!testDatabaseUrl)('GitHub scans are compressed, durable, and backward compatible', async () => {
  process.env.DATABASE_URL = testDatabaseUrl

  const { getLatestGitHubResult, getRecentPublicResults, getResult, saveResult } = await import('@/lib/store')
  const { getDatabase } = await import('@/lib/db')
  const { client } = getDatabase()
  const result = makeGitHubResult()
  result.batch = { totalSkills: 1, results: [] }
  const normalizedResult = normalizeValidationResult(result)

  await saveResult(result)

  expect(await getLatestGitHubResult('openai', 'SKILLS', 'skills/reviewer')).toEqual(normalizedResult)
  expect(await getRecentPublicResults()).toEqual([normalizedResult])
  const stored = await client.query('SELECT result, expires_at FROM validation_results WHERE id = $1', [result.id])
  expect(stored.rows[0]?.expires_at).toBeNull()
  expect(String(stored.rows[0]?.result)).toMatch(/^gzip:/)

  const { GET } = await import('@/app/api/validate/route')
  const response = await GET(new NextRequest(`http://localhost/api/validate?id=${result.id}`, {
    headers: { 'Accept-Encoding': 'gzip' },
  }))
  expect(response.headers.get('Content-Encoding')).toBe('gzip')
  expect(JSON.parse(gunzipSync(Buffer.from(await response.arrayBuffer())).toString('utf8'))).toEqual(normalizedResult)

  const legacy = makeGitHubResult()
  await client.query(
    'INSERT INTO validation_results (id, result, created_at, expires_at) VALUES ($1, $2, $3, $4)',
    [legacy.id, JSON.stringify(legacy), Date.now(), null]
  )
  expect(await getResult(legacy.id)).toEqual(normalizeValidationResult(legacy))

  const privateUpload = { ...makeGitHubResult(), id: randomUUID(), source: { type: 'upload' as const } }
  await saveResult(privateUpload)
  expect((await getRecentPublicResults()).some((scan) => scan.id === privateUpload.id)).toBe(false)

  await client.end()
})
