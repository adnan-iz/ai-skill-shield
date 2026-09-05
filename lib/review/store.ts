import { randomUUID } from 'node:crypto'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { REVIEW_DECISIONS } from './types'
import type {
  ApplyReviewInput,
  ClaimedReview,
  CommentEventInput,
  FindingReviewInput,
  NewScanReview,
  ReviewDecision,
  ReviewProjection,
} from './types'
import type { ValidationResult, ValidationSummary } from '@/lib/validator/types'

interface ReviewRow {
  id: string
  delivery_id: string
  scan_id: string
  target: string
  commit_sha: string
  status: string
  stage: ClaimedReview['stage']
  attempts: number
  original_score: number
  original_risk_level: ValidationResult['riskLevel']
}

interface ApplicationRow {
  review_id: string
  scan_id: string
  effective_finding_keys: string
  suppressed_finding_keys: string
  effective_risk_level: ValidationResult['riskLevel']
  effective_summary: string
}

const APPROVAL_REQUIRED_DECISIONS = new Set<ReviewDecision>([
  'false_positive',
  'severity_reduced',
  'severity_increased',
])

export async function recordCommentEvent(input: CommentEventInput): Promise<{ inserted: boolean }> {
  await ensureDatabase()
  const { client } = getDatabase()
  const result = await client.query(
    `INSERT INTO github_comment_events (
       delivery_id, event_action, owner, repo, issue_number, comment_id,
       commenter_login, author_association, comment_body, status, ignore_reason, created_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT DO NOTHING`,
    [
      input.deliveryId, input.eventAction, input.owner, input.repo, input.issueNumber, input.commentId,
      input.commenterLogin, input.authorAssociation, input.commentBody, input.status, input.ignoreReason ?? null, Date.now(),
    ]
  )
  return { inserted: result.rowCount === 1 }
}

export async function createScanReview(input: NewScanReview): Promise<string> {
  await ensureDatabase()
  const { client } = getDatabase()
  const id = randomUUID()
  const now = Date.now()
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO scan_reviews (
       id, delivery_id, scan_id, target, commit_sha, status, stage, run_at, attempts,
       original_score, original_risk_level, prompt_version, created_at
     ) VALUES ($1, $2, $3, $4, $5, 'queued', 'queued', $6, 0, $7, $8, $9, $10)
     ON CONFLICT (delivery_id) DO NOTHING
     RETURNING id`,
    [id, input.deliveryId, input.scanId, input.target, input.commitSha, input.runAt ?? now, input.originalScore, input.originalRiskLevel, input.promptVersion ?? '', now]
  )
  if (inserted.rows[0]?.id) return inserted.rows[0].id

  const existing = await client.query<{ id: string }>(
    'SELECT id FROM scan_reviews WHERE delivery_id = $1',
    [input.deliveryId]
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
       SELECT id
       FROM scan_reviews
       WHERE status = 'queued' AND run_at <= $1
       ORDER BY run_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED
     )
     UPDATE scan_reviews review
     SET status = 'processing', attempts = review.attempts + 1, started_at = $1
     FROM due
     WHERE review.id = due.id
     RETURNING review.*`,
    [now, Math.max(1, Math.min(limit, 10))]
  )
  return claimed.rows.map((row) => ({
    id: row.id,
    deliveryId: row.delivery_id,
    scanId: row.scan_id,
    target: row.target,
    commitSha: row.commit_sha,
    status: 'processing',
    stage: row.stage,
    attempts: row.attempts,
    originalScore: row.original_score,
    originalRiskLevel: row.original_risk_level,
  }))
}

export async function replaceFindingReviews(reviewId: string, decisions: FindingReviewInput[]): Promise<void> {
  const findingKeys = new Set<string>()
  for (const decision of decisions) {
    if (!REVIEW_DECISIONS.includes(decision.decision)) throw new Error(`Unsupported review decision: ${decision.decision}`)
    if (!Number.isInteger(decision.confidence) || decision.confidence < 0 || decision.confidence > 100) {
      throw new Error('Review confidence must be an integer between 0 and 100')
    }
    if (findingKeys.has(decision.findingKey)) throw new Error(`Duplicate finding key: ${decision.findingKey}`)
    findingKeys.add(decision.findingKey)
  }

  await ensureDatabase()
  const { client } = getDatabase()
  await client.query('BEGIN')
  try {
    await client.query('DELETE FROM finding_reviews WHERE review_id = $1', [reviewId])
    for (const decision of decisions) {
      const requiresApproval = APPROVAL_REQUIRED_DECISIONS.has(decision.decision)
      await client.query(
        `INSERT INTO finding_reviews (
           id, review_id, finding_key, decision, original_severity, proposed_severity,
           confidence, claim, explanation, evidence, requires_approval, approval_status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          randomUUID(), reviewId, decision.findingKey, decision.decision, decision.originalSeverity,
          decision.proposedSeverity ?? null, decision.confidence, decision.claim, decision.explanation,
          JSON.stringify(decision.evidence), requiresApproval, requiresApproval ? 'pending' : 'not_required',
        ]
      )
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

export async function applyReviewDecisions(input: ApplyReviewInput): Promise<ReviewProjection> {
  await ensureDatabase()
  const { client } = getDatabase()
  await client.query('BEGIN')
  try {
    const review = await client.query<ReviewRow>(
      'SELECT * FROM scan_reviews WHERE id = $1 FOR UPDATE',
      [input.reviewId]
    )
    const row = review.rows[0]
    if (!row) throw new Error(`Scan review not found: ${input.reviewId}`)

    const existing = await client.query<ApplicationRow>(
      'SELECT review_id, scan_id, effective_finding_keys, suppressed_finding_keys, effective_risk_level, effective_summary FROM review_applications WHERE review_id = $1',
      [input.reviewId]
    )
    if (existing.rows[0]) {
      await client.query('COMMIT')
      return projectionFromRow(existing.rows[0])
    }
    if (row.status !== 'awaiting_approval') throw new Error('Scan review must be awaiting approval before application')

    const now = Date.now()
    const application = await client.query<ApplicationRow>(
      `INSERT INTO review_applications (
         id, scan_id, review_id, effective_finding_keys, suppressed_finding_keys,
         effective_risk_level, effective_summary, applied_by, reason, created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (review_id) DO NOTHING
       RETURNING review_id, scan_id, effective_finding_keys, suppressed_finding_keys, effective_risk_level, effective_summary`,
      [
        randomUUID(), row.scan_id, input.reviewId, JSON.stringify(input.effectiveFindingKeys), JSON.stringify(input.suppressedFindingKeys),
        input.effectiveRiskLevel, JSON.stringify(input.effectiveSummary), input.appliedBy, input.reason, now,
      ]
    )
    const applied = application.rows[0]
    if (!applied) throw new Error('Review application was not created')

    await client.query(
      `UPDATE scan_reviews
       SET status = 'completed', stage = 'done', effective_risk_level = $2,
           verified_rescan_id = $3, completed_at = $4
       WHERE id = $1`,
      [input.reviewId, input.effectiveRiskLevel, input.verifiedRescanId ?? null, now]
    )
    await client.query('COMMIT')
    return projectionFromRow(applied, input.verifiedRescanId)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}

export async function getAppliedProjection(scanId: string): Promise<ReviewProjection | null> {
  await ensureDatabase()
  const { client } = getDatabase()
  const application = await client.query<ApplicationRow & { verified_rescan_id: string | null }>(
    `SELECT application.review_id, application.scan_id, application.effective_finding_keys,
            application.suppressed_finding_keys, application.effective_risk_level,
            application.effective_summary, review.verified_rescan_id
     FROM review_applications application
     INNER JOIN scan_reviews review ON review.id = application.review_id
     WHERE application.scan_id = $1
     ORDER BY application.created_at DESC
     LIMIT 1`,
    [scanId]
  )
  const row = application.rows[0]
  return row ? projectionFromRow(row, row.verified_rescan_id ?? undefined) : null
}

function projectionFromRow(row: ApplicationRow, verifiedRescanId?: string): ReviewProjection {
  return {
    reviewId: row.review_id,
    scanId: row.scan_id,
    effectiveFindingKeys: JSON.parse(row.effective_finding_keys) as string[],
    suppressedFindingKeys: JSON.parse(row.suppressed_finding_keys) as string[],
    effectiveRiskLevel: row.effective_risk_level,
    effectiveSummary: JSON.parse(row.effective_summary) as ValidationSummary,
    ...(verifiedRescanId ? { verifiedRescanId } : {}),
  }
}
