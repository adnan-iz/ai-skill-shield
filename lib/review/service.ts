import { ensureDatabase, getDatabase } from '@/lib/db'
import { getResult } from '@/lib/store'
import { normalizeGitHubSkillPath } from '@/lib/trust'
import { applyReviewDecisions, linkVerifiedRescan as persistVerifiedRescan } from './store'
import type { RescanLinkResult, ReviewProjection } from './types'
import type { SkillSource } from '@/lib/validator/types'
import { projectEffectiveResult } from './projection'
import type { AppliedFindingDecision } from './projection'
import type { ReviewDecision } from './types'

const MAX_DECISION_IDS = 20

export interface DecideReviewInput {
  reviewId: string
  action: 'approve' | 'reject'
  findingReviewIds: string[]
  reviewer: string
  notes?: string
}

export interface DecideReviewResult {
  reviewId: string
  status: 'awaiting_approval' | 'completed'
  pendingDecisionCount: number
  application: ReviewProjection | null
}

export type VerifiedRescanLinkResult = RescanLinkResult | { linked: false; reason: 'sha_mismatch' }

export class ReviewServiceError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_input' | 'not_found' | 'conflict',
  ) {
    super(message)
    this.name = 'ReviewServiceError'
  }
}

interface ReviewRow {
  id: string
  scan_id: string
  status: string
  owner: string
  repo: string
  path: string
  commit_sha: string
}

interface DecisionRow {
  id: string
  review_id: string
  finding_key: string
  decision: ReviewDecision
  proposed_severity: 'critical' | 'high' | 'medium' | 'low' | 'info' | null
  requires_approval: boolean
  approval_status: 'not_required' | 'pending' | 'approved' | 'rejected'
}

/** Records finding-level human decisions, then immutably applies a fully resolved review. */
export async function decideReview(input: DecideReviewInput): Promise<DecideReviewResult> {
  validateDecisionInput(input)
  await ensureDatabase()
  const { client: pool } = getDatabase()
  const client = await pool.connect()
  let scanId = ''
  let pendingDecisionCount = 0
  let decisions: AppliedFindingDecision[] = []

  await client.query('BEGIN')
  try {
    const reviewResult = await client.query<ReviewRow>(
      'SELECT id, scan_id, status, owner, repo, path, commit_sha FROM scan_reviews WHERE id = $1 FOR UPDATE',
      [input.reviewId],
    )
    const review = reviewResult.rows[0]
    if (!review) throw new ReviewServiceError('Scan review not found', 'not_found')
    if (review.status !== 'awaiting_approval' && review.status !== 'completed') {
      throw new ReviewServiceError('Scan review is not awaiting approval', 'conflict')
    }
    scanId = review.scan_id

    const selected = await client.query<DecisionRow>(
      `SELECT id, review_id, finding_key, decision, proposed_severity, requires_approval, approval_status
       FROM finding_reviews WHERE id = ANY($1::text[]) FOR UPDATE`,
      [input.findingReviewIds],
    )
    const selectedById = new Map(selected.rows.map((row) => [row.id, row]))
    for (const id of input.findingReviewIds) {
      const decision = selectedById.get(id)
      if (!decision) throw new ReviewServiceError('One or more finding reviews were not found', 'not_found')
      if (decision.review_id !== input.reviewId) {
        throw new ReviewServiceError('Finding review belongs to another scan review', 'conflict')
      }
      if (!decision.requires_approval) {
        throw new ReviewServiceError('Finding review does not require an approval decision', 'invalid_input')
      }
      const targetStatus = input.action === 'approve' ? 'approved' : 'rejected'
      if (decision.approval_status !== 'pending' && decision.approval_status !== targetStatus) {
        throw new ReviewServiceError('Finding review already has a different decision', 'conflict')
      }
    }

    const now = Date.now()
    const targetStatus = input.action === 'approve' ? 'approved' : 'rejected'
    await client.query(
      `UPDATE finding_reviews SET approval_status = $3, reviewed_by = $4, reviewed_at = $5
       WHERE review_id = $1 AND id = ANY($2::text[]) AND approval_status = 'pending'`,
      [input.reviewId, input.findingReviewIds, targetStatus, input.reviewer.trim(), now],
    )
    const pending = await client.query<{ count: number }>(
      `SELECT COUNT(*)::INTEGER AS count FROM finding_reviews
       WHERE review_id = $1 AND requires_approval = TRUE AND approval_status = 'pending'`,
      [input.reviewId],
    )
    pendingDecisionCount = pending.rows[0]?.count ?? 0
    const allDecisions = await client.query<DecisionRow>(
      `SELECT id, review_id, finding_key, decision, proposed_severity, requires_approval, approval_status
       FROM finding_reviews WHERE review_id = $1 ORDER BY id`,
      [input.reviewId],
    )
    decisions = allDecisions.rows.map((decision) => ({
      findingKey: decision.finding_key,
      decision: decision.decision,
      proposedSeverity: decision.proposed_severity,
      approvalStatus: decision.approval_status,
    }))
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  if (pendingDecisionCount > 0) {
    return { reviewId: input.reviewId, status: 'awaiting_approval', pendingDecisionCount, application: null }
  }

  const original = await getResult(scanId)
  if (!original) throw new Error('Immutable validation result for scan review was not found')
  const projected = projectEffectiveResult(original, decisions)
  const application = await applyReviewDecisions({
    reviewId: input.reviewId,
    appliedBy: input.reviewer.trim(),
    reason: input.notes?.trim() || `Finding review decisions ${input.action}d by ${input.reviewer.trim()}.`,
  }, original)
  if (application.scanId !== scanId) throw new Error('Applied review does not match its locked scan')
  if (application.effectiveRiskLevel !== projected.result.riskLevel
    || JSON.stringify(application.effectiveSummary) !== JSON.stringify(projected.result.summary)) {
    throw new Error('Persisted review projection does not match the deterministic effective result')
  }
  return { reviewId: input.reviewId, status: 'completed', pendingDecisionCount: 0, application }
}

/** Links a normal validator result only when it represents the review's exact immutable source. */
export async function linkVerifiedRescan(reviewId: string, verifiedRescanId: string): Promise<VerifiedRescanLinkResult> {
  await ensureDatabase()
  const { client } = getDatabase()
  const reviewResult = await client.query<ReviewRow>(
    'SELECT id, scan_id, status, owner, repo, path, commit_sha FROM scan_reviews WHERE id = $1',
    [reviewId],
  )
  const review = reviewResult.rows[0]
  if (!review) return { linked: false, reason: 'review_not_found' }
  if (review.scan_id === verifiedRescanId) return { linked: false, reason: 'source_mismatch' }

  const [original, rescan] = await Promise.all([getResult(review.scan_id), getResult(verifiedRescanId)])
  if (!rescan) return { linked: false, reason: 'rescan_not_found' }
  if (!original || !matchesRepositorySource(original.source, review) || !matchesRepositorySource(rescan.source, review)) {
    return { linked: false, reason: 'source_mismatch' }
  }
  if (rescan.source!.sha!.toLowerCase() !== review.commit_sha.toLowerCase()) {
    return { linked: false, reason: 'sha_mismatch' }
  }
  return persistVerifiedRescan(reviewId, verifiedRescanId)
}

function validateDecisionInput(input: DecideReviewInput): void {
  if (!input.reviewId || input.reviewId.length > 100) throw new ReviewServiceError('Invalid review ID', 'invalid_input')
  if (input.action !== 'approve' && input.action !== 'reject') throw new ReviewServiceError('Invalid review action', 'invalid_input')
  if (input.findingReviewIds.length < 1 || input.findingReviewIds.length > MAX_DECISION_IDS) {
    throw new ReviewServiceError(`Choose between 1 and ${MAX_DECISION_IDS} finding reviews`, 'invalid_input')
  }
  if (new Set(input.findingReviewIds).size !== input.findingReviewIds.length || input.findingReviewIds.some((id) => !id || id.length > 100)) {
    throw new ReviewServiceError('Finding review IDs must be unique and bounded', 'invalid_input')
  }
  const reviewer = input.reviewer.trim()
  if (!reviewer || reviewer.length > 200) throw new ReviewServiceError('Reviewer must be between 1 and 200 characters', 'invalid_input')
  if (input.notes && input.notes.length > 1_000) throw new ReviewServiceError('Review notes must be at most 1000 characters', 'invalid_input')
}

function matchesRepositorySource(source: SkillSource | undefined, review: ReviewRow): boolean {
  return source?.type === 'github'
    && typeof source.owner === 'string'
    && typeof source.repo === 'string'
    && typeof source.sha === 'string'
    && /^[a-f0-9]{40}$/i.test(source.sha)
    && /^[a-f0-9]{40}$/i.test(review.commit_sha)
    && source.owner.toLowerCase() === review.owner.toLowerCase()
    && source.repo.toLowerCase() === review.repo.toLowerCase()
    && normalizeGitHubSkillPath(source.path) === normalizeGitHubSkillPath(review.path)
}
