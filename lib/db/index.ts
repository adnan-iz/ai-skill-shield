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
          expires_at BIGINT,
          source_owner TEXT,
          source_repo TEXT,
          source_path TEXT,
          source_type TEXT,
          skill_name TEXT,
          overall_score INTEGER,
          risk_level TEXT,
          findings_count INTEGER,
          category TEXT,
          description TEXT,
          searchable TEXT
        )
      `)
      // Migrate existing tables
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS source_owner TEXT`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS source_repo TEXT`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS source_path TEXT`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS source_type TEXT`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS skill_name TEXT`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS overall_score INTEGER`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS risk_level TEXT`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS findings_count INTEGER`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS category TEXT`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS description TEXT`)
      await client.query(`ALTER TABLE validation_results ADD COLUMN IF NOT EXISTS searchable TEXT`)
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_vr_explore
          ON validation_results (created_at DESC)
          WHERE expires_at IS NULL OR expires_at > 0 AND source_type = 'github'
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
      await client.query(`ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS owner TEXT`)
      await client.query(`ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS repo TEXT`)
      await client.query(`ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS path TEXT`)
      await client.query(`ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS issue_number INTEGER`)
      await client.query(`ALTER TABLE scan_reviews ADD COLUMN IF NOT EXISTS original_summary TEXT`)
      await client.query(`
        UPDATE scan_reviews
        SET owner = COALESCE(owner, 'legacy'),
            repo = COALESCE(repo, 'legacy'),
            path = COALESCE(path, target, ''),
            original_summary = COALESCE(original_summary, '{"totalChecks":0,"passed":0,"warnings":0,"failed":0,"criticalCount":0,"highCount":0,"mediumCount":0,"lowCount":0,"infoCount":0}')
        WHERE owner IS NULL OR repo IS NULL OR path IS NULL OR original_summary IS NULL
      `)
      await client.query(`
        WITH missing_issue_numbers AS (
          SELECT id, -ROW_NUMBER() OVER (ORDER BY id)::INTEGER AS issue_number
          FROM scan_reviews
          WHERE issue_number IS NULL
        )
        UPDATE scan_reviews review
        SET issue_number = missing.issue_number
        FROM missing_issue_numbers missing
        WHERE review.id = missing.id
      `)
      await client.query(`ALTER TABLE scan_reviews ALTER COLUMN owner SET NOT NULL`)
      await client.query(`ALTER TABLE scan_reviews ALTER COLUMN repo SET NOT NULL`)
      await client.query(`ALTER TABLE scan_reviews ALTER COLUMN path SET NOT NULL`)
      await client.query(`ALTER TABLE scan_reviews ALTER COLUMN issue_number SET NOT NULL`)
      await client.query(`ALTER TABLE scan_reviews ALTER COLUMN original_summary SET NOT NULL`)
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
