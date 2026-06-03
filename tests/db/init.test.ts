import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, expect, test, vi } from 'vitest'

const databaseFiles: string[] = []

afterEach(async () => {
  vi.resetModules()
  delete process.env.DATABASE_URL

  await Promise.all(
    databaseFiles.splice(0).map(async (databaseFile) => {
      await rm(databaseFile, { force: true }).catch(() => {})
    })
  )
})

test('ensureDatabase bootstraps all required tables for a fresh sqlite file', async () => {
  const databaseFile = join(tmpdir(), `skillshield-${randomUUID()}.db`)
  databaseFiles.push(databaseFile)
  process.env.DATABASE_URL = `file:${databaseFile}`

  const { client, ensureDatabase } = await import('@/lib/db')

  await ensureDatabase()

  const tablesResult = await client.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
  )

  const tableNames = tablesResult.rows
    .map((row) => row.name)
    .filter((name): name is string => typeof name === 'string')

  expect(tableNames).toEqual(
    expect.arrayContaining([
      'approvals',
      'audit_logs',
      'rate_limits',
      'validation_results',
      'webhooks',
    ])
  )
})
