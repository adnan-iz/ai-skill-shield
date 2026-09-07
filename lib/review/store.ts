import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { getResult } from '@/lib/store'
import { normalizeGitHubSkillPath } from '@/lib/trust'
import { findingKey } from './finding-key'
import { projectEffectiveResult } from './projection'
import { REVIEW_DECISIONS } from './types'
import type { ApplyReviewInput, ClaimedReview, CommentEventInput, CommentReviewQueueResult, FindingReviewInput, NewScanReview, RescanLinkResult, ReviewDecision, ReviewProcessingContext, ReviewProjection, ReviewReplyContext, StoredCandidateClaim, StoredFindingReview } from './types'
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
  id: string
  finding_key: string
  decision: ReviewDecision
  original_severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  proposed_severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | null
  requires_approval: boolean
  approval_status: 'not_required' | 'pending' | 'approved' | 'rejected'
  confidence: number
  claim: string
  explanation: string
  evidence: string
}

const APPROVAL_REQUIRED_DECISIONS = new Set<ReviewDecision>(['false_positive', 'severity_reduced', 'severity_increased'])
const MAX_FINDING_CANDIDATES = 20
const PROCESSING_LEASE_MS = 10 * 60 * 1_000
const REPLY_REFRESH_PENDING = JSON.stringify({ replyRefresh: 'pending' })
const REPLY_REFRESH_PROCESSING = JSON.stringify({ replyRefresh: 'processing' })

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

/** Atomically records a delivery and queues its review, leaving failed deliveries retryable. */
export async function recordCommentEventAndCreateScanReview(
  event: CommentEventInput,
  review: NewScanReview
): Promise<CommentReviewQueueResult> {
  if (event.deliveryId !== review.deliveryId) throw new Error('Comment event and review delivery IDs must match')

  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const now = Date.now()
    const recorded = await client.query<{ delivery_id: string }>(
      `INSERT INTO github_comment_events (delivery_id, event_action, owner, repo, issue_number, comment_id, commenter_login, author_association, comment_body, status, ignore_reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'queued', NULL, $10)
       ON CONFLICT DO NOTHING RETURNING delivery_id`,
      [event.deliveryId, event.eventAction, event.owner, event.repo, event.issueNumber, event.commentId, event.commenterLogin, event.authorAssociation, event.commentBody, now]
    )
    if (!recorded.rows[0]) return committed(client, { status: 'duplicate' })

    const id = randomUUID()
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO scan_reviews (id, delivery_id, scan_id, owner, repo, path, issue_number, target, commit_sha, status, stage, run_at, attempts, original_score, original_risk_level, original_summary, prompt_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'queued', 'queued', $10, 0, $11, $12, $13, $14, $15)
       ON CONFLICT DO NOTHING RETURNING id`,
      [id, review.deliveryId, review.scanId, review.owner, review.repo, normalizeGitHubSkillPath(review.path), review.issueNumber, review.target, review.commitSha, review.runAt ?? now, review.originalScore, review.originalRiskLevel, JSON.stringify(review.originalSummary), review.promptVersion ?? '', now]
    )
    if (inserted.rows[0]?.id) return committed(client, { status: 'queued', reviewId: inserted.rows[0].id })

    const active = await client.query<{ id: string }>(
      `SELECT id FROM scan_reviews
       WHERE owner = $1 AND repo = $2 AND issue_number = $3
         AND status IN ('queued', 'processing', 'awaiting_approval')
       LIMIT 1`,
      [review.owner, review.repo, review.issueNumber]
    )
    if (!active.rows[0]) throw new Error('Unable to create scan review')

    await client.query(
      `UPDATE github_comment_events
       SET status = 'ignored', ignore_reason = 'active_review'
       WHERE delivery_id = $1`,
      [event.deliveryId]
    )
    return committed(client, { status: 'ignored', reason: 'active_review' })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function claimQueuedReviews(limit = 5): Promise<ClaimedReview[]> {
  await ensureDatabase()
  const { client } = getDatabase()
  const now = Date.now()
  const claimed = await client.query<ReviewRow>(
    `WITH expired AS (
       UPDATE scan_reviews SET status = 'failed', stage = 'done', completed_at = $1, last_error = 'Processing lease expired after three attempts'
       WHERE status = 'processing' AND started_at <= $3 AND attempts >= 3
       RETURNING delivery_id
     ), failed_events AS (
       UPDATE github_comment_events event SET status = 'failed'
       FROM expired WHERE event.delivery_id = expired.delivery_id
     ), due AS (
       SELECT id FROM scan_reviews
       WHERE (status = 'queued' AND run_at <= $1)
          OR (status = 'processing' AND started_at <= $3 AND attempts < 3)
       ORDER BY run_at ASC LIMIT $2 FOR UPDATE SKIP LOCKED
     )
     UPDATE scan_reviews review SET status = 'processing', attempts = review.attempts + 1, started_at = $1
     FROM due WHERE review.id = due.id RETURNING review.*`,
    [now, Math.max(1, Math.min(limit, 10)), now - PROCESSING_LEASE_MS]
  )
  return claimed.rows.map((row) => ({
    id: row.id, deliveryId: row.delivery_id, scanId: row.scan_id, target: row.target, commitSha: row.commit_sha,
    status: 'processing', stage: row.stage, attempts: row.attempts, originalScore: row.original_score, originalRiskLevel: row.original_risk_level,
  }))
}

interface ProcessingContextRow extends ReviewRow {
  comment_body: string
  stage_data: string | null
  reply_comment_id: number | null
  proposed_risk_level: ValidationResult['riskLevel'] | null
}

/** Loads only a currently claimed review and its immutable triggering comment. */
export async function getReviewProcessingContext(reviewId: string): Promise<ReviewProcessingContext | null> {
  await ensureDatabase()
  const { client } = getDatabase()
  const result = await client.query<ProcessingContextRow>(
    `SELECT review.*, event.comment_body
     FROM scan_reviews review INNER JOIN github_comment_events event ON event.delivery_id = review.delivery_id
     WHERE review.id = $1 AND review.status = 'processing'`,
    [reviewId],
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id, deliveryId: row.delivery_id, scanId: row.scan_id, target: row.target, commitSha: row.commit_sha,
    status: 'processing', stage: row.stage, attempts: row.attempts, originalScore: row.original_score,
    originalRiskLevel: row.original_risk_level, owner: row.owner, repo: row.repo, path: row.path,
    issueNumber: row.issue_number, commentBody: row.comment_body, stageData: parseStageData(row.stage_data),
  }
}

export async function beginReviewEvidenceCollection(reviewId: string): Promise<void> {
  await updateProcessingStage(reviewId, ['queued', 'collecting_evidence'], 'collecting_evidence')
}

/** Saves validated claim identities before the adjudication provider may be called. */
export async function saveReviewClaims(
  reviewId: string,
  claims: StoredCandidateClaim[],
  provider: string,
  model?: string,
): Promise<void> {
  validateStoredClaims(claims)
  await ensureDatabase()
  const { client } = getDatabase()
  const result = await client.query(
    `UPDATE scan_reviews SET stage = 'adjudicating', stage_data = $2, provider = $3, model = $4
     WHERE id = $1 AND status = 'processing' AND stage = 'collecting_evidence'`,
    [reviewId, JSON.stringify({ claims }), provider, model ?? null],
  )
  if (result.rowCount !== 1) throw new Error('Scan review evidence stage is no longer claimable')
}

/** Atomically stores strict adjudication output and advances past the provider call. */
export async function saveReviewAdjudication(
  reviewId: string,
  decisions: FindingReviewInput[],
  proposedRiskLevel: ValidationResult['riskLevel'],
): Promise<void> {
  validateFindingReviewInputs(decisions)
  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const review = await client.query<Pick<ReviewRow, 'status' | 'stage'>>(
      'SELECT status, stage FROM scan_reviews WHERE id = $1 FOR UPDATE', [reviewId],
    )
    if (!review.rows[0] || review.rows[0].status !== 'processing' || review.rows[0].stage !== 'adjudicating') {
      throw new Error('Scan review adjudication stage is no longer claimable')
    }
    await client.query('DELETE FROM finding_reviews WHERE review_id = $1', [reviewId])
    await insertFindingReviews(client, reviewId, decisions)
    await client.query(
      `UPDATE scan_reviews SET stage = 'publishing', stage_data = NULL, proposed_risk_level = $2 WHERE id = $1`,
      [reviewId, proposedRiskLevel],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getReviewReplyContext(reviewId: string): Promise<ReviewReplyContext | null> {
  await ensureDatabase()
  const { client } = getDatabase()
  const reviewResult = await client.query<ProcessingContextRow>(
    `SELECT review.*, event.comment_body
     FROM scan_reviews review INNER JOIN github_comment_events event ON event.delivery_id = review.delivery_id
     WHERE review.id = $1 AND review.status IN ('processing', 'awaiting_approval', 'completed')`, [reviewId],
  )
  const row = reviewResult.rows[0]
  if (!row || !row.proposed_risk_level) return null
  const findings = await client.query<FindingReviewRow>(
    `SELECT id, finding_key, decision, original_severity, proposed_severity, confidence, claim, explanation,
            evidence, requires_approval, approval_status
     FROM finding_reviews WHERE review_id = $1 ORDER BY id`, [reviewId],
  )
  return {
    id: row.id, deliveryId: row.delivery_id, scanId: row.scan_id, target: row.target, commitSha: row.commit_sha,
    status: row.status as ReviewReplyContext['status'], stage: row.stage, attempts: row.attempts,
    originalScore: row.original_score, originalRiskLevel: row.original_risk_level, owner: row.owner, repo: row.repo,
    path: row.path, issueNumber: row.issue_number, commentBody: row.comment_body,
    proposedRiskLevel: row.proposed_risk_level, replyCommentId: row.reply_comment_id,
    decisions: findings.rows.map(storedFindingReview),
  }
}

export async function persistReviewReply(reviewId: string, commentId: number): Promise<void> {
  if (!Number.isSafeInteger(commentId) || commentId < 1) throw new Error('Invalid GitHub reply comment id')
  await ensureDatabase()
  const { client } = getDatabase()
  const result = await client.query(
    `UPDATE scan_reviews SET reply_comment_id = COALESCE(reply_comment_id, $2)
     WHERE id = $1 AND status = 'processing' AND stage = 'publishing'
       AND (reply_comment_id IS NULL OR reply_comment_id = $2)`, [reviewId, commentId],
  )
  if (result.rowCount !== 1) throw new Error('Scan review reply identity conflicts with stored state')
}

/** Makes a published proposal visible and returns whether human action is pending. */
export async function finishReviewPublication(reviewId: string): Promise<
  { status: 'awaiting_approval'; pendingDecisionCount: number } | { status: 'completed'; pendingDecisionCount: 0 }
> {
  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const locked = await client.query<ReviewRow>(
      `SELECT * FROM scan_reviews
       WHERE id = $1 AND status = 'processing' AND stage = 'publishing' AND reply_comment_id IS NOT NULL FOR UPDATE`, [reviewId],
    )
    if (!locked.rows[0]) throw new Error('Scan review publication stage is incomplete')
    const pending = await client.query<{ count: number }>(
      `SELECT COUNT(*)::INTEGER AS count FROM finding_reviews
       WHERE review_id = $1 AND requires_approval = TRUE AND approval_status = 'pending'`, [reviewId],
    )
    const pendingDecisionCount = pending.rows[0]?.count ?? 0
    const now = Date.now()
    if (pendingDecisionCount === 0) {
      const decisions = await client.query<FindingReviewRow>(
        `SELECT id, finding_key, decision, original_severity, proposed_severity, confidence, claim, explanation,
                evidence, requires_approval, approval_status
         FROM finding_reviews WHERE review_id = $1 FOR UPDATE`, [reviewId],
      )
      const original = await getResult(locked.rows[0].scan_id)
      if (!original) throw new Error('Immutable validation result for scan review was not found')
      const projection = deriveFullProjection(locked.rows[0], decisions.rows, original)
      await client.query(
        `INSERT INTO review_applications (id, scan_id, review_id, effective_finding_keys, suppressed_finding_keys, effective_risk_level, effective_summary, applied_by, reason, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'ai-skill-shield', 'No report-changing AI proposal required human approval.', $8)
         ON CONFLICT (review_id) DO NOTHING`,
        [randomUUID(), locked.rows[0].scan_id, reviewId, JSON.stringify(projection.effectiveFindingKeys), JSON.stringify(projection.suppressedFindingKeys), projection.effectiveRiskLevel, JSON.stringify(projection.effectiveSummary), now],
      )
      await client.query(`UPDATE scan_reviews SET status = 'completed', stage = 'done', effective_risk_level = $2, completed_at = $3 WHERE id = $1`, [reviewId, projection.effectiveRiskLevel, now])
    } else {
      await client.query(`UPDATE scan_reviews SET status = 'awaiting_approval', stage = 'done', completed_at = $2 WHERE id = $1`, [reviewId, now])
    }
    await client.query(`UPDATE github_comment_events SET status = 'completed' WHERE delivery_id = $1`, [locked.rows[0].delivery_id])
    await client.query('COMMIT')
    return pendingDecisionCount === 0
      ? { status: 'completed', pendingDecisionCount: 0 }
      : { status: 'awaiting_approval', pendingDecisionCount }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** Claims durable post-decision reply refresh work without changing review status. */
export async function claimPendingReplyRefreshes(limit = 5): Promise<string[]> {
  await ensureDatabase()
  const { client } = getDatabase()
  const now = Date.now()
  const result = await client.query<{ id: string }>(
    `WITH due AS (
       SELECT id FROM scan_reviews
       WHERE status IN ('awaiting_approval', 'completed') AND run_at <= $1
         AND (stage_data = $2 OR (stage_data = $3 AND started_at <= $4))
       ORDER BY run_at ASC LIMIT $5 FOR UPDATE SKIP LOCKED
     )
     UPDATE scan_reviews review SET stage_data = $3, started_at = $1
     FROM due WHERE review.id = due.id RETURNING review.id`,
    [now, REPLY_REFRESH_PENDING, REPLY_REFRESH_PROCESSING, now - PROCESSING_LEASE_MS, Math.max(1, Math.min(limit, 5))],
  )
  return result.rows.map((row) => row.id)
}

export async function completeReviewReplyRefresh(reviewId: string): Promise<void> {
  await ensureDatabase()
  const { client } = getDatabase()
  await client.query(
    `UPDATE scan_reviews SET stage_data = NULL WHERE id = $1 AND stage_data IN ($2, $3)`,
    [reviewId, REPLY_REFRESH_PENDING, REPLY_REFRESH_PROCESSING],
  )
}

export async function retryReviewReplyRefresh(reviewId: string): Promise<void> {
  await ensureDatabase()
  const { client } = getDatabase()
  await client.query(
    `UPDATE scan_reviews SET stage_data = $2, run_at = $3 WHERE id = $1 AND stage_data = $4`,
    [reviewId, REPLY_REFRESH_PENDING, Date.now() + 30_000, REPLY_REFRESH_PROCESSING],
  )
}

/** Requeues only transient work and permanently fails it after three total claims. */
export async function retryOrFailReview(reviewId: string, errorMessage: string, transient: boolean): Promise<'retried' | 'failed'> {
  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const locked = await client.query<Pick<ReviewRow, 'attempts' | 'delivery_id'>>(
      `SELECT attempts, delivery_id FROM scan_reviews WHERE id = $1 AND status = 'processing' FOR UPDATE`, [reviewId],
    )
    const review = locked.rows[0]
    if (!review) throw new Error('Scan review is no longer processing')
    const retry = transient && review.attempts < 3
    const now = Date.now()
    await client.query(
      retry
        ? `UPDATE scan_reviews SET status = 'queued', run_at = $2, last_error = $3 WHERE id = $1`
        : `UPDATE scan_reviews SET status = 'failed', stage = 'done', completed_at = $2, last_error = $3 WHERE id = $1`,
      [reviewId, retry ? now + Math.min(60_000, 1_000 * (2 ** review.attempts)) : now, boundedError(errorMessage)],
    )
    await client.query(`UPDATE github_comment_events SET status = $2 WHERE delivery_id = $1`, [review.delivery_id, retry ? 'processing' : 'failed'])
    await client.query('COMMIT')
    return retry ? 'retried' : 'failed'
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function replaceFindingReviews(reviewId: string, decisions: FindingReviewInput[]): Promise<void> {
  validateFindingReviewInputs(decisions)

  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  await client.query('BEGIN')
  try {
    const review = await client.query<Pick<ReviewRow, 'status'>>('SELECT status FROM scan_reviews WHERE id = $1 FOR UPDATE', [reviewId])
    if (!review.rows[0]) throw new Error(`Scan review not found: ${reviewId}`)
    if (review.rows[0].status !== 'processing') throw new Error('Scan review must be processing before its decisions can change')

    await client.query('DELETE FROM finding_reviews WHERE review_id = $1', [reviewId])
    await insertFindingReviews(client, reviewId, decisions)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

async function updateProcessingStage(reviewId: string, expected: ClaimedReview['stage'][], stage: ClaimedReview['stage']): Promise<void> {
  await ensureDatabase()
  const { client } = getDatabase()
  const result = await client.query(
    `UPDATE scan_reviews SET stage = $2 WHERE id = $1 AND status = 'processing' AND stage = ANY($3::text[])`,
    [reviewId, stage, expected],
  )
  if (result.rowCount !== 1) throw new Error('Scan review stage is no longer claimable')
}

function validateStoredClaims(claims: StoredCandidateClaim[]): void {
  if (!Array.isArray(claims) || claims.length > MAX_FINDING_CANDIDATES) throw new Error('Invalid stored scan review claims')
  const keys = new Set<string>()
  for (const claim of claims) {
    if (!/^[a-f0-9]{64}$/.test(claim.findingKey) || !claim.claim.trim() || claim.claim.length > 1_000 || keys.has(claim.findingKey)) {
      throw new Error('Invalid stored scan review claims')
    }
    keys.add(claim.findingKey)
  }
}

function parseStageData(value: string | null): { claims: StoredCandidateClaim[] } | null {
  if (!value) return null
  let parsed: unknown
  try { parsed = JSON.parse(value) } catch { throw new Error('Invalid stored scan review stage data') }
  const claims = parsed && typeof parsed === 'object' ? (parsed as { claims?: unknown }).claims : undefined
  if (!Array.isArray(claims)) throw new Error('Invalid stored scan review stage data')
  validateStoredClaims(claims as StoredCandidateClaim[])
  return { claims: claims as StoredCandidateClaim[] }
}

function validateFindingReviewInputs(decisions: FindingReviewInput[]): void {
  if (decisions.length > MAX_FINDING_CANDIDATES) throw new Error(`A review can contain at most ${MAX_FINDING_CANDIDATES} finding candidates`)
  const findingKeys = new Set<string>()
  for (const decision of decisions) {
    if (!REVIEW_DECISIONS.includes(decision.decision)) throw new Error(`Unsupported review decision: ${decision.decision}`)
    if (!Number.isInteger(decision.confidence) || decision.confidence < 0 || decision.confidence > 100) throw new Error('Review confidence must be an integer between 0 and 100')
    if (findingKeys.has(decision.findingKey)) throw new Error(`Duplicate finding key: ${decision.findingKey}`)
    findingKeys.add(decision.findingKey)
  }
}

async function insertFindingReviews(client: PoolClient, reviewId: string, decisions: FindingReviewInput[]): Promise<void> {
  for (const decision of decisions) {
    const requiresApproval = APPROVAL_REQUIRED_DECISIONS.has(decision.decision)
    await client.query(
      `INSERT INTO finding_reviews (id, review_id, finding_key, decision, original_severity, proposed_severity, confidence, claim, explanation, evidence, requires_approval, approval_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [randomUUID(), reviewId, decision.findingKey, decision.decision, decision.originalSeverity, decision.proposedSeverity ?? null, decision.confidence, decision.claim, decision.explanation, JSON.stringify(decision.evidence), requiresApproval, requiresApproval ? 'pending' : 'not_required'],
    )
  }
}

function storedFindingReview(row: FindingReviewRow): StoredFindingReview {
  let evidence: FindingReviewInput['evidence']
  try { evidence = JSON.parse(row.evidence) as FindingReviewInput['evidence'] } catch { throw new Error('Invalid stored finding review evidence') }
  return {
    id: row.id, findingKey: row.finding_key, decision: row.decision, originalSeverity: row.original_severity,
    proposedSeverity: row.proposed_severity ?? undefined, confidence: row.confidence, claim: row.claim,
    explanation: row.explanation, evidence, requiresApproval: row.requires_approval, approvalStatus: row.approval_status,
  }
}

function boundedError(value: string): string {
  return value.replace(/[\r\n\t]+/g, ' ').slice(0, 1_000)
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
    const original = await getResult(row.scan_id)
    if (!original) throw new Error('Immutable validation result for scan review was not found')
    const projection = deriveFullProjection(row, decisions.rows, original)
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

function deriveFullProjection(
  review: ReviewRow,
  decisions: FindingReviewRow[],
  original: ValidationResult,
): Omit<ReviewProjection, 'reviewId' | 'scanId' | 'verifiedRescanId'> {
  if (original.id !== review.scan_id) throw new Error('Immutable validation result does not belong to this review')
  const effective = projectEffectiveResult(original, decisions.map((decision) => ({
    findingKey: decision.finding_key,
    decision: decision.decision,
    proposedSeverity: decision.proposed_severity,
    approvalStatus: decision.approval_status,
  })), 'approved')
  const effectiveFindingKeys = effective.result.findings.map((finding) => findingKey(original.id, finding))
  const effectiveKeySet = new Set(effectiveFindingKeys)
  const suppressedFindingKeys = original.findings
    .map((finding) => findingKey(original.id, finding))
    .filter((key) => !effectiveKeySet.has(key))
  return {
    effectiveFindingKeys,
    suppressedFindingKeys,
    effectiveRiskLevel: effective.result.riskLevel,
    effectiveSummary: effective.result.summary,
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
