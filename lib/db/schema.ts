import { bigint, boolean, index, integer, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

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

/** Delayed, user-requested GitHub notifications that exceeded the request window. */
export const githubNotificationJobs = pgTable('github_notification_jobs', {
  scanId: text('scan_id').primaryKey(),
  status: text('status', { enum: ['queued', 'processing', 'completed', 'failed'] }).notNull().default('queued'),
  runAt: bigint('run_at', { mode: 'number' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  startedAt: bigint('started_at', { mode: 'number' }),
  completedAt: bigint('completed_at', { mode: 'number' }),
})

export const githubCommentEvents = pgTable('github_comment_events', {
  deliveryId: text('delivery_id').primaryKey(),
  eventAction: text('event_action').notNull(),
  owner: text('owner').notNull(),
  repo: text('repo').notNull(),
  issueNumber: integer('issue_number').notNull(),
  commentId: bigint('comment_id', { mode: 'number' }).notNull(),
  commenterLogin: text('commenter_login').notNull(),
  authorAssociation: text('author_association').notNull(),
  commentBody: text('comment_body').notNull(),
  status: text('status', { enum: ['ignored', 'queued', 'processing', 'completed', 'failed'] }).notNull(),
  ignoreReason: text('ignore_reason'),
  lastError: text('last_error'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  startedAt: bigint('started_at', { mode: 'number' }),
  completedAt: bigint('completed_at', { mode: 'number' }),
}, (table) => [
  uniqueIndex('github_comment_identity_idx').on(table.owner, table.repo, table.issueNumber, table.commentId),
])

export const scanReviews = pgTable('scan_reviews', {
  id: text('id').primaryKey(),
  deliveryId: text('delivery_id').notNull(),
  scanId: text('scan_id').notNull(),
  owner: text('owner').notNull(),
  repo: text('repo').notNull(),
  path: text('path').notNull(),
  issueNumber: integer('issue_number').notNull(),
  target: text('target').notNull(),
  commitSha: text('commit_sha').notNull(),
  status: text('status', { enum: ['queued', 'processing', 'awaiting_approval', 'completed', 'failed'] }).notNull().default('queued'),
  stage: text('stage', { enum: ['queued', 'collecting_evidence', 'adjudicating', 'publishing', 'done'] }).notNull().default('queued'),
  runAt: bigint('run_at', { mode: 'number' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  originalScore: integer('original_score').notNull(),
  originalRiskLevel: text('original_risk_level').notNull(),
  originalSummary: text('original_summary').notNull(),
  proposedRiskLevel: text('proposed_risk_level'),
  effectiveRiskLevel: text('effective_risk_level'),
  verifiedRescanId: text('verified_rescan_id'),
  replyCommentId: bigint('reply_comment_id', { mode: 'number' }),
  provider: text('provider'),
  model: text('model'),
  promptVersion: text('prompt_version').notNull().default(''),
  summary: text('summary'),
  /** Validated resumable stage output only; never credentials or raw provider/repository content. */
  stageData: text('stage_data'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  startedAt: bigint('started_at', { mode: 'number' }),
  completedAt: bigint('completed_at', { mode: 'number' }),
}, (table) => [
  uniqueIndex('scan_reviews_delivery_id_idx').on(table.deliveryId),
  uniqueIndex('scan_reviews_active_issue_idx').on(table.owner, table.repo, table.issueNumber)
    .where(sql`${table.status} IN ('queued', 'processing', 'awaiting_approval')`),
  index('scan_reviews_due_idx').on(table.status, table.runAt),
])

export const findingReviews = pgTable('finding_reviews', {
  id: text('id').primaryKey(),
  reviewId: text('review_id').notNull(),
  findingKey: text('finding_key').notNull(),
  decision: text('decision', { enum: ['confirmed', 'false_positive', 'severity_reduced', 'severity_increased', 'fixed_after_scan', 'insufficient_evidence', 'not_related'] }).notNull(),
  originalSeverity: text('original_severity').notNull(),
  proposedSeverity: text('proposed_severity'),
  confidence: integer('confidence').notNull(),
  claim: text('claim').notNull(),
  explanation: text('explanation').notNull(),
  evidence: text('evidence').notNull(),
  requiresApproval: boolean('requires_approval').notNull(),
  approvalStatus: text('approval_status', { enum: ['not_required', 'pending', 'approved', 'rejected'] }).notNull(),
  reviewedBy: text('reviewed_by'),
  reviewedAt: bigint('reviewed_at', { mode: 'number' }),
}, (table) => [
  uniqueIndex('finding_reviews_review_finding_idx').on(table.reviewId, table.findingKey),
  index('finding_reviews_review_id_idx').on(table.reviewId),
])

export const reviewApplications = pgTable('review_applications', {
  id: text('id').primaryKey(),
  scanId: text('scan_id').notNull(),
  reviewId: text('review_id').notNull(),
  effectiveFindingKeys: text('effective_finding_keys').notNull(),
  suppressedFindingKeys: text('suppressed_finding_keys').notNull(),
  effectiveRiskLevel: text('effective_risk_level').notNull(),
  effectiveSummary: text('effective_summary').notNull(),
  appliedBy: text('applied_by').notNull(),
  reason: text('reason').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
}, (table) => [
  uniqueIndex('review_applications_review_id_idx').on(table.reviewId),
  index('review_applications_scan_id_idx').on(table.scanId),
])
