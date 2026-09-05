import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { getResult } from '@/lib/store'
import { normalizeGitHubSkillPath } from '@/lib/trust'
import { REVIEW_DECISIONS } from './types'
import type { ApplyReviewInput, ClaimedReview, CommentEventInput, FindingReviewInput, NewScanReview, RescanLinkResult, ReviewDecision, ReviewProjection } from './types'
import type { ValidationResult, ValidationSummary } from '@/lib/validator/types'

interface ReviewRow {
  id: string
  delivery_id: string
  scan_id: string
  owner: string
  repo: string
  path: string
  issue_number: number
  target: string
  commit_sha: string
  status: string
  stage: ClaimedReview['stage']
  attempts: number
  original_score: number
  original_risk_level: ValidationResult['riskLevel']
  original_summary: string
  verified_rescan_id: string | null
}

interface ApplicationRow {
  review_id: string
  scan_id: string
  effective_finding_keys: string
  suppressed_finding_keys: string
  effective_risk_level: ValidationResult['riskLevel']
  effective_summary: string
}

interface FindingReviewRow {
  finding_key: string
  decision: ReviewDecision
  original_severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  proposed_severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | null
  requires_approval: boolean
  approval_status: 'not_required' | 'pending' | 'approved' | 'rejected'
}

const APPROVAL_REQUIRED_DECISIONS = new Set<ReviewDecision>(['false_positive', 'severity_reduced', 'severity_increased'])
const MAX_FINDING_CANDIDATES = 20

export async function recordCommentEvent(input: CommentEventInput): Promise<{ inserted: boolean }> {
  await ensureDatabase()
  const { client } = getDatabase()
  const result = await client.query(
    `INSERT INTO github_comment_events (delivery_id, event_action, owner, repo, issue_number, comment_id, commenter_login, author_association, comment_body, status, ignore_reason, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT DO NOTHING`,
    [input.deliveryId, input.eventAction, input.owner, input.repo, input.issueNumber, input.commentId, input.commenterLogin, input.authorAssociation, input.commentBody, input.status, input.ignoreReason ?? null, Date.now()]
  )
  return { inserted: result.rowCount === 1 }
}

export async function createScanReview(input: NewScanReview): Promise<string> {
  await ensureDatabase()
  const { client } = getDatabase()
  const id = randomUUID()
  const now = Date.now()
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO scan_reviews (id, delivery_id, scan_id, owner, repo, path, issue_number, target, commit_sha, status, stage, run_at, attempts, original_score, original_risk_level, original_summary, prompt_version, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'queued', 'queued', $10, 0, $11, $12, $13, $14, $15)
     ON CONFLICT DO NOTHING RETURNING id`,
    [id, input.deliveryId, input.scanId, input.owner, input.repo, normalizeGitHubSkillPath(input.path), input.issueNumber, input.target, input.commitSha, input.runAt ?? now, input.originalScore, input.originalRiskLevel, JSON.stringify(input.originalSummary), input.promptVersion ?? '', now]
  )
  if (inserted.rows[0]?.id) return inserted.rows[0].id

  const existing = await client.query<{ id: string }>(
    `SELECT id FROM scan_reviews
     WHERE delivery_id = $1 OR (owner = $2 AND repo = $3 AND issue_number = $4 AND status IN ('queued', 'processing', 'awaiting_approval'))
     ORDER BY CASE WHEN delivery_id = $1 THEN 0 ELSE 1 END LIMIT 1`,
    [input.deliveryId, input.owner, input.repo, input.issueNumber]
  )
  if (existing.rows[0]?.id) return existing.rows[0].id
  throw new Error('Unable to create or retrieve scan review')
}

export async function claimQueuedReviews(limit = 5): Promise<ClaimedReview[]> {
  await ensureDatabase()
  const { client } = getDatabase()
  const now = Date.now()
  const claimed = await client.query<ReviewRow>(
    `WITH due AS (
       SELECT id FROM scan_reviews WHERE status = 'queued' AND run_at <= $1 ORDER BY run_at ASC LIMIT $2 FOR UPDATE SKIP LOCKED
     )
     UPDATE scan_reviews review SET status = 'processing', attempts = review.attempts + 1, started_at = $1
     FROM due WHERE review.id = due.id RETURNING review.*`,
    [now, Math.max(1, Math.min(limit, 10))]
  )
  return claimed.rows.map((row) => ({
    id: row.id, deliveryId: row.delivery_id, scanId: row.scan_id, target: row.target, commitSha: row.commit_sha,
    status: 'processing', stage: row.stage, attempts: row.attempts, originalScore: row.original_score, originalRiskLevel: row.original_risk_level,
  }))
}

export async function replaceFindingReviews(reviewId: string, decisions: FindingReviewInput[]): Promise<void> {
  if (decisions.length > MAX_FINDING_CANDIDATES) throw new Error(`A review can contain at most ${MAX_FINDING_CANDIDATES} finding candidates`)
  const findingKeys = new Set<string>()
  for (const decision of decisions) {
    if (!REVIEW_DECISIONS.includes(decision.decision)) throw new Error(`Unsupported review decision: ${decision.decision}`)
    if (!Number.isInteger(decision.confidence) || decision.confidence < 0 || decision.confidence > 100) throw new Error('Review confidence must be an integer between 0 and 100')
    if (findingKeys.has(decision.findingKey)) throw new Error(`Duplicate finding key: ${decision.findingKey}`)
    findingKeys.add(decision.findingKey)
  }

  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const review = await client.query<Pick<ReviewRow, 'status'>>('SELECT status FROM scan_reviews WHERE id = $1 FOR UPDATE', [reviewId])
    if (!review.rows[0]) throw new Error(`Scan review not found: ${reviewId}`)
    if (review.rows[0].status !== 'processing') throw new Error('Scan review must be processing before its decisions can change')

    await client.query('DELETE FROM finding_reviews WHERE review_id = $1', [reviewId])
    for (const decision of decisions) {
      const requiresApproval = APPROVAL_REQUIRED_DECISIONS.has(decision.decision)
      await client.query(
        `INSERT INTO finding_reviews (id, review_id, finding_key, decision, original_severity, proposed_severity, confidence, claim, explanation, evidence, requires_approval, approval_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [randomUUID(), reviewId, decision.findingKey, decision.decision, decision.originalSeverity, decision.proposedSeverity ?? null, decision.confidence, decision.claim, decision.explanation, JSON.stringify(decision.evidence), requiresApproval, requiresApproval ? 'pending' : 'not_required']
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function applyReviewDecisions(input: ApplyReviewInput): Promise<ReviewProjection> {
  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const review = await client.query<ReviewRow>('SELECT * FROM scan_reviews WHERE id = $1 FOR UPDATE', [input.reviewId])
    const row = review.rows[0]
    if (!row) throw new Error(`Scan review not found: ${input.reviewId}`)

    const existing = await client.query<ApplicationRow>(
      `SELECT review_id, scan_id, effective_finding_keys, suppressed_finding_keys, effective_risk_level, effective_summary
       FROM review_applications WHERE review_id = $1`, [input.reviewId]
    )
    if (existing.rows[0]) {
      await client.query('COMMIT')
      return projectionFromRow(existing.rows[0], row.verified_rescan_id ?? undefined)
    }
    if (row.status !== 'awaiting_approval') throw new Error('Scan review must be awaiting approval before application')

    const decisions = await client.query<FindingReviewRow>(
      `SELECT finding_key, decision, original_severity, proposed_severity, requires_approval, approval_status
       FROM finding_reviews WHERE review_id = $1 FOR UPDATE`, [input.reviewId]
    )
    if (decisions.rows.some((decision) => decision.approval_status === 'pending')) throw new Error('Scan review has pending approval decisions')
    const projection = deriveProjection(row, decisions.rows)
    const now = Date.now()
    const application = await client.query<ApplicationRow>(
      `INSERT INTO review_applications (id, scan_id, review_id, effective_finding_keys, suppressed_finding_keys, effective_risk_level, effective_summary, applied_by, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (review_id) DO NOTHING
       RETURNING review_id, scan_id, effective_finding_keys, suppressed_finding_keys, effective_risk_level, effective_summary`,
      [randomUUID(), row.scan_id, input.reviewId, JSON.stringify(projection.effectiveFindingKeys), JSON.stringify(projection.suppressedFindingKeys), projection.effectiveRiskLevel, JSON.stringify(projection.effectiveSummary), input.appliedBy, input.reason, now]
    )
    const applied = application.rows[0]
    if (!applied) throw new Error('Review application was not created')
    await client.query(`UPDATE scan_reviews SET status = 'completed', stage = 'done', effective_risk_level = $2, completed_at = $3 WHERE id = $1`, [input.reviewId, projection.effectiveRiskLevel, now])
    await client.query('COMMIT')
    return projectionFromRow(applied)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function linkVerifiedRescan(reviewId: string, verifiedRescanId: string): Promise<RescanLinkResult> {
  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const review = await client.query<ReviewRow>('SELECT * FROM scan_reviews WHERE id = $1 FOR UPDATE', [reviewId])
    const row = review.rows[0]
    if (!row) return committed(client, { linked: false, reason: 'review_not_found' })
    if (verifiedRescanId === row.scan_id) return committed(client, { linked: false, reason: 'source_mismatch' })
    if (row.verified_rescan_id === verifiedRescanId) return committed(client, { linked: true })
    if (row.verified_rescan_id) return committed(client, { linked: false, reason: 'rescan_already_linked' })

    const [original, rescan] = await Promise.all([getResult(row.scan_id), getResult(verifiedRescanId)])
    if (!rescan) return committed(client, { linked: false, reason: 'rescan_not_found' })
    if (!original || !sameReviewSource(original, row) || !sameReviewSource(rescan, row)) return committed(client, { linked: false, reason: 'source_mismatch' })

    await client.query('UPDATE scan_reviews SET verified_rescan_id = $2 WHERE id = $1', [reviewId, verifiedRescanId])
    return committed(client, { linked: true })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getAppliedProjection(scanId: string): Promise<ReviewProjection | null> {
  await ensureDatabase()
  const { client } = getDatabase()
  const application = await client.query<ApplicationRow & { verified_rescan_id: string | null }>(
    `SELECT application.review_id, application.scan_id, application.effective_finding_keys, application.suppressed_finding_keys,
            application.effective_risk_level, application.effective_summary, review.verified_rescan_id
     FROM review_applications application INNER JOIN scan_reviews review ON review.id = application.review_id
     WHERE application.scan_id = $1 ORDER BY application.created_at DESC LIMIT 1`, [scanId]
  )
  const row = application.rows[0]
  return row ? projectionFromRow(row, row.verified_rescan_id ?? undefined) : null
}

async function committed<T>(client: PoolClient, result: T): Promise<T> {
  await client.query('COMMIT')
  return result
}

function projectionFromRow(row: ApplicationRow, verifiedRescanId?: string): ReviewProjection {
  return {
    reviewId: row.review_id, scanId: row.scan_id,
    effectiveFindingKeys: JSON.parse(row.effective_finding_keys) as string[],
    suppressedFindingKeys: JSON.parse(row.suppressed_finding_keys) as string[],
    effectiveRiskLevel: row.effective_risk_level,
    effectiveSummary: JSON.parse(row.effective_summary) as ValidationSummary,
    ...(verifiedRescanId ? { verifiedRescanId } : {}),
  }
}

function deriveProjection(review: ReviewRow, decisions: FindingReviewRow[]): Omit<ReviewProjection, 'reviewId' | 'scanId' | 'verifiedRescanId'> {
  const summary = parseSummary(review.original_summary)
  const effectiveFindingKeys: string[] = []
  const suppressedFindingKeys: string[] = []
  for (const decision of decisions) {
    if (decision.approval_status === 'rejected') continue
    if (decision.approval_status !== 'approved' && decision.approval_status !== 'not_required') continue
    if (decision.requires_approval && decision.approval_status !== 'approved') continue
    if (decision.decision === 'false_positive') {
      decrementSeverity(summary, decision.original_severity)
      suppressedFindingKeys.push(decision.finding_key)
    } else {
      effectiveFindingKeys.push(decision.finding_key)
      if ((decision.decision === 'severity_reduced' || decision.decision === 'severity_increased') && decision.proposed_severity) {
        decrementSeverity(summary, decision.original_severity)
        incrementSeverity(summary, decision.proposed_severity)
      }
    }
  }
  return { effectiveFindingKeys, suppressedFindingKeys, effectiveRiskLevel: riskLevelFromSummary(summary), effectiveSummary: summary }
}

function parseSummary(value: string): ValidationSummary {
  const summary = JSON.parse(value) as ValidationSummary
  const fields: Array<keyof ValidationSummary> = ['totalChecks', 'passed', 'warnings', 'failed', 'criticalCount', 'highCount', 'mediumCount', 'lowCount', 'infoCount']
  if (fields.some((field) => !Number.isInteger(summary[field]) || summary[field] < 0)) throw new Error('Scan review has an invalid immutable validation summary')
  return { ...summary }
}

function decrementSeverity(summary: ValidationSummary, severity: FindingReviewRow['original_severity']): void {
  const field = severityCountField(severity)
  summary[field] = Math.max(0, summary[field] - 1)
}

function incrementSeverity(summary: ValidationSummary, severity: FindingReviewRow['original_severity']): void {
  summary[severityCountField(severity)] += 1
}

function severityCountField(severity: FindingReviewRow['original_severity']): 'criticalCount' | 'highCount' | 'mediumCount' | 'lowCount' | 'infoCount' {
  return `${severity}Count` as 'criticalCount' | 'highCount' | 'mediumCount' | 'lowCount' | 'infoCount'
}

function riskLevelFromSummary(summary: ValidationSummary): ValidationResult['riskLevel'] {
  if (summary.criticalCount > 0) return 'critical'
  if (summary.highCount > 0) return 'high'
  if (summary.mediumCount > 0) return 'medium'
  if (summary.lowCount > 0) return 'low'
  return 'safe'
}

function sameReviewSource(result: ValidationResult, review: ReviewRow): boolean {
  const source = result.source
  if (source?.type !== 'github' || !source.owner || !source.repo || !source.sha) return false
  return source.owner.toLowerCase() === review.owner.toLowerCase()
    && source.repo.toLowerCase() === review.repo.toLowerCase()
    && normalizeGitHubSkillPath(source.path) === normalizeGitHubSkillPath(review.path)
    && isFullSha(source.sha) && isFullSha(review.commit_sha)
    && source.sha.toLowerCase() === review.commit_sha.toLowerCase()
}

function isFullSha(value: string): boolean {
  return /^[a-f0-9]{40}$/i.test(value)
}
