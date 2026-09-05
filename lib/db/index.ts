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

      await client.query(`
        CREATE TABLE IF NOT EXISTS github_notification_jobs (
          scan_id TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL DEFAULT 'queued',
          run_at BIGINT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at BIGINT NOT NULL,
          started_at BIGINT,
          completed_at BIGINT
        )
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS github_comment_events (
          delivery_id TEXT PRIMARY KEY NOT NULL,
          event_action TEXT NOT NULL,
          owner TEXT NOT NULL,
          repo TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          comment_id BIGINT NOT NULL,
          commenter_login TEXT NOT NULL,
          author_association TEXT NOT NULL,
          comment_body TEXT NOT NULL,
          status TEXT NOT NULL,
          ignore_reason TEXT,
          last_error TEXT,
          created_at BIGINT NOT NULL,
          started_at BIGINT,
          completed_at BIGINT
        )
      `)
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS github_comment_identity_idx
        ON github_comment_events (owner, repo, issue_number, comment_id)
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS scan_reviews (
          id TEXT PRIMARY KEY NOT NULL,
          delivery_id TEXT NOT NULL UNIQUE,
          scan_id TEXT NOT NULL,
          owner TEXT NOT NULL,
          repo TEXT NOT NULL,
          path TEXT NOT NULL,
          issue_number INTEGER NOT NULL,
          target TEXT NOT NULL,
          commit_sha TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'queued',
          stage TEXT NOT NULL DEFAULT 'queued',
          run_at BIGINT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          original_score INTEGER NOT NULL,
          original_risk_level TEXT NOT NULL,
          original_summary TEXT NOT NULL,
          proposed_risk_level TEXT,
          effective_risk_level TEXT,
          verified_rescan_id TEXT,
          reply_comment_id BIGINT,
          provider TEXT,
          model TEXT,
          prompt_version TEXT NOT NULL DEFAULT '',
          summary TEXT,
          stage_data TEXT,
          created_at BIGINT NOT NULL,
          started_at BIGINT,
          completed_at BIGINT
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS scan_reviews_due_idx
        ON scan_reviews (status, run_at)
      `)
      await client.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS scan_reviews_active_issue_idx
        ON scan_reviews (owner, repo, issue_number)
        WHERE status IN ('queued', 'processing', 'awaiting_approval')
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS finding_reviews (
          id TEXT PRIMARY KEY NOT NULL,
          review_id TEXT NOT NULL,
          finding_key TEXT NOT NULL,
          decision TEXT NOT NULL,
          original_severity TEXT NOT NULL,
          proposed_severity TEXT,
          confidence INTEGER NOT NULL CHECK (confidence BETWEEN 0 AND 100),
          claim TEXT NOT NULL,
          explanation TEXT NOT NULL,
          evidence TEXT NOT NULL,
          requires_approval BOOLEAN NOT NULL,
          approval_status TEXT NOT NULL,
          reviewed_by TEXT,
          reviewed_at BIGINT,
          UNIQUE (review_id, finding_key)
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS finding_reviews_review_id_idx
        ON finding_reviews (review_id)
      `)

      await client.query(`
        CREATE TABLE IF NOT EXISTS review_applications (
          id TEXT PRIMARY KEY NOT NULL,
          scan_id TEXT NOT NULL,
          review_id TEXT NOT NULL UNIQUE,
          effective_finding_keys TEXT NOT NULL,
          suppressed_finding_keys TEXT NOT NULL,
          effective_risk_level TEXT NOT NULL,
          effective_summary TEXT NOT NULL,
          applied_by TEXT NOT NULL,
          reason TEXT NOT NULL,
          created_at BIGINT NOT NULL
        )
      `)
      await client.query(`
        CREATE INDEX IF NOT EXISTS review_applications_scan_id_idx
        ON review_applications (scan_id)
      `)
    })().catch((error) => {
      databaseReadyPromise = null
      throw error
    })
  }

  await databaseReadyPromise
}
