import { readFileSync } from 'node:fs'
import { afterEach, expect, test, vi } from 'vitest'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

afterEach(async () => {
  vi.resetModules()
  delete process.env.DATABASE_URL
})

test('requires a PostgreSQL database URL', async () => {
  const { databaseConfig } = await import('@/lib/db')

  expect(() => databaseConfig()).toThrow('DATABASE_URL must be a PostgreSQL connection URL')
})

test('upgrades scan review identity columns before creating the active-issue index', () => {
  const bootstrap = readFileSync('lib/db/index.ts', 'utf8')
  const index = bootstrap.indexOf('CREATE UNIQUE INDEX IF NOT EXISTS scan_reviews_active_issue_idx')

  expect(index).toBeGreaterThan(-1)
  for (const column of ['owner', 'repo', 'path', 'issue_number', 'original_summary']) {
    expect(bootstrap.indexOf(`ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS ${column}`)).toBeGreaterThan(-1)
    expect(bootstrap.indexOf(`ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS ${column}`)).toBeLessThan(index)
  }
})

test.skipIf(!testDatabaseUrl)('ensureDatabase bootstraps all required PostgreSQL tables', async () => {
  process.env.DATABASE_URL = testDatabaseUrl

  const { ensureDatabase, getDatabase } = await import('@/lib/db')

  await ensureDatabase()
  const { client } = getDatabase()

  const tablesResult = await client.query(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  )

  const tableNames = tablesResult.rows
    .map((row) => row.tablename)
    .filter((name): name is string => typeof name === 'string')

  expect(tableNames).toEqual(
    expect.arrayContaining([
      'approvals',
      'audit_logs',
      'rate_limits',
      'validation_results',
      'webhooks',
      'github_comment_events',
      'scan_reviews',
      'finding_reviews',
      'review_applications',
    ])
  )
  await client.end()
})
