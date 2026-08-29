import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema'

export function databaseConfig() {
  const connectionString = process.env.DATABASE_URL?.trim()
  if (!connectionString?.match(/^postgres(?:ql)?:\/\//i)) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL')
  }
  return { connectionString }
}

function createDatabase() {
  const client = new Pool(databaseConfig())
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
      await client.query(`
        CREATE TABLE IF NOT EXISTS validation_results (
          id TEXT PRIMARY KEY NOT NULL,
          result TEXT NOT NULL,
          created_at BIGINT NOT NULL,
          expires_at BIGINT
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS rate_limits (
          key TEXT PRIMARY KEY NOT NULL,
          count INTEGER NOT NULL,
          reset_at BIGINT NOT NULL
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id TEXT PRIMARY KEY NOT NULL,
          event TEXT NOT NULL,
          scan_id TEXT,
          metadata TEXT,
          created_at BIGINT NOT NULL
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS approvals (
          id TEXT PRIMARY KEY NOT NULL,
          scan_id TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          reviewed_by TEXT,
          review_notes TEXT,
          created_at BIGINT NOT NULL,
          reviewed_at BIGINT
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS webhooks (
          id TEXT PRIMARY KEY NOT NULL,
          url TEXT NOT NULL,
          events TEXT NOT NULL,
          secret TEXT,
          enabled BOOLEAN NOT NULL DEFAULT TRUE,
          created_at BIGINT NOT NULL,
          last_triggered_at BIGINT,
          last_status_code INTEGER
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS github_scan_notifications (
          target TEXT PRIMARY KEY NOT NULL,
          owner TEXT NOT NULL,
          repo TEXT NOT NULL,
          path TEXT NOT NULL DEFAULT '',
          issue_number INTEGER NOT NULL,
          last_sha TEXT NOT NULL,
          last_scan_id TEXT NOT NULL,
          last_notified_at BIGINT NOT NULL
        )
      `)
    })().catch((error) => {
      databaseReadyPromise = null
      throw error
    })
  }

  await databaseReadyPromise
}
