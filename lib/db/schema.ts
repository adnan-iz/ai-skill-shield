import { bigint, boolean, integer, pgTable, text } from 'drizzle-orm/pg-core'

export const validationResults = pgTable('validation_results', {
  id: text('id').primaryKey(),
  result: text('result').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  expiresAt: bigint('expires_at', { mode: 'number' }),
})

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: bigint('reset_at', { mode: 'number' }).notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  event: text('event').notNull(),
  scanId: text('scan_id'),
  metadata: text('metadata'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
})

export const approvals = pgTable('approvals', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  reviewedBy: text('reviewed_by'),
  reviewNotes: text('review_notes'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  reviewedAt: bigint('reviewed_at', { mode: 'number' }),
})

export const webhooks = pgTable('webhooks', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  events: text('events').notNull(),
  secret: text('secret'),
  enabled: boolean('enabled').default(true).notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  lastTriggeredAt: bigint('last_triggered_at', { mode: 'number' }),
  lastStatusCode: integer('last_status_code'),
})

/** One owner-facing GitHub issue per opted-in repository skill. */
export const githubScanNotifications = pgTable('github_scan_notifications', {
  target: text('target').primaryKey(),
  owner: text('owner').notNull(),
  repo: text('repo').notNull(),
  path: text('path').notNull().default(''),
  issueNumber: integer('issue_number').notNull(),
  lastSha: text('last_sha').notNull(),
  lastScanId: text('last_scan_id').notNull(),
  lastNotifiedAt: bigint('last_notified_at', { mode: 'number' }).notNull(),
})
