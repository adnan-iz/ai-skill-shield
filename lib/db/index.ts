import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

function createDatabase() {
  const client = createClient({
    url: process.env.DATABASE_URL || 'file:./data/skillshield.db',
  })
  return { client, db: drizzle(client, { schema }) }
}

let databaseInstance: ReturnType<typeof createDatabase> | null = null

export function getDatabase(): ReturnType<typeof createDatabase> {
  if (!databaseInstance) databaseInstance = createDatabase()
  return databaseInstance
}

let databaseReadyPromise: Promise<void> | null = null

export async function ensureDatabase(): Promise<void> {
  if (!databaseReadyPromise) {
    databaseReadyPromise = (async () => {
      const { client } = getDatabase()
      await client.execute(`
        CREATE TABLE IF NOT EXISTS validation_results (
          id TEXT PRIMARY KEY NOT NULL,
          result TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          expires_at INTEGER
        )
      `)

      await client.execute(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY NOT NULL,
          count INTEGER NOT NULL,
          reset_at INTEGER NOT NULL
        )
      `)

      await client.execute(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY NOT NULL,
          event TEXT NOT NULL,
          scan_id TEXT,
          metadata TEXT,
          created_at INTEGER NOT NULL
        )
      `)

      await client.execute(`
        CREATE TABLE IF NOT EXISTS approvals (
          id TEXT PRIMARY KEY NOT NULL,
          scan_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          reviewed_by TEXT,
          review_notes TEXT,
          created_at INTEGER NOT NULL,
          reviewed_at INTEGER
        )
      `)

      await client.execute(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id TEXT PRIMARY KEY NOT NULL,
          url TEXT NOT NULL,
          events TEXT NOT NULL,
          secret TEXT,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          last_triggered_at INTEGER,
          last_status_code INTEGER
        )
      `)
    })().catch((error) => {
      databaseReadyPromise = null
      throw error
    })
  }

  await databaseReadyPromise
}
