import { isAiProvider, type AiReviewConfig } from '@/lib/ai-review'
import { publishReviewReply, refreshReviewReply, type ReviewReply } from '@/lib/github/review-replies'
import { getResult } from '@/lib/store'
import { adjudicateClaims, extractClaims } from './adjudicator'
import { collectEvidence } from './evidence'
import { indexFindings } from './finding-key'
import { projectEffectiveResult } from './projection'
import { beginReviewEvidenceCollection, claimPendingReplyRefreshes, claimQueuedReviews, completeReviewReplyRefresh, finishReviewPublication, getReviewProcessingContext, getReviewReplyContext, persistReviewReply, retryOrFailReview, retryReviewReplyRefresh, saveReviewAdjudication, saveReviewClaims } from './store'
import type { ClaimedReview, FindingReviewInput, ReviewProcessingContext, ReviewReplyContext, StoredCandidateClaim } from './types'
import type { ValidationResult } from '@/lib/validator/types'

const MAX_BATCH = 5

export interface QueueResult {
  claimed: number
  completed: number
  awaitingApproval: number
  retried: number
  failed: number
}

interface ReviewFailure extends Error {
  transient?: boolean
}

/** Claims bounded work so concurrent cron invocations cannot process the same review. */
export async function processQueuedScanReviews(limit = MAX_BATCH): Promise<QueueResult> {
  const boundedLimit = Number.isInteger(limit) ? Math.max(1, Math.min(limit, MAX_BATCH)) : MAX_BATCH
  await processPendingReplyRefreshes(boundedLimit)
  const reviews = await claimQueuedReviews(boundedLimit)
  const result: QueueResult = { claimed: reviews.length, completed: 0, awaitingApproval: 0, retried: 0, failed: 0 }

  for (const review of reviews) {
    try {
      const outcome = await processClaimedReview(review)
      if (outcome === 'completed') result.completed++
      else result.awaitingApproval++
    } catch (error) {
      const failure = normalizeFailure(error)
      const outcome = await retryOrFailReview(review.id, failure.message, failure.transient)
      result[outcome]++
    }
  }
  return result
}

async function processClaimedReview(claimed: ClaimedReview): Promise<'completed' | 'awaitingApproval'> {
  const context = await getReviewProcessingContext(claimed.id)
  if (!context) throw permanent('Claimed scan review is unavailable')
  const scan = await getResult(context.scanId)
  if (!scan || !matchesClaimedSource(scan, context)) throw permanent('The immutable scan source is unavailable')

  let stage = context.stage
  let claims = context.stageData?.claims ?? null

  if (stage === 'queued' || stage === 'collecting_evidence') {
    const config = reviewAiConfig()
    await beginReviewEvidenceCollection(context.id)
    claims = await extractClaims(context.commentBody, indexFindings(scan), config)
    await saveReviewClaims(context.id, claims, config.provider, config.model)
    stage = 'adjudicating'
  }

  if (stage === 'adjudicating') {
    const config = reviewAiConfig()
    if (!claims) throw permanent('Stored scan review claims are unavailable')
    const collected = await collectEvidence(scan, claims)
    const decisions = await adjudicateClaims(claims, collected, config)
    const proposedRisk = proposedProjection(scan, decisions).riskLevel
    await saveReviewAdjudication(context.id, decisions, proposedRisk)
    stage = 'publishing'
  }

  if (stage !== 'publishing') throw permanent(`Unsupported scan review stage: ${stage}`)
  const replyContext = await getReviewReplyContext(context.id)
  if (!replyContext) throw permanent('Stored scan review reply context is unavailable')
  const hasPendingApproval = replyContext.decisions.some((decision) => decision.requiresApproval && decision.approvalStatus === 'pending')
  const reply = toReply(replyContext, hasPendingApproval ? 'awaiting_approval' : 'completed')
  const published = await publishReviewReply(reply)
  await persistReviewReply(context.id, published.commentId)
  const publication = await finishReviewPublication(context.id)
  return publication.status === 'completed' ? 'completed' : 'awaitingApproval'
}

async function processPendingReplyRefreshes(limit: number): Promise<void> {
  const reviewIds = await claimPendingReplyRefreshes(limit)
  for (const reviewId of reviewIds) {
    try {
      await refreshReviewReply(reviewId)
      await completeReviewReplyRefresh(reviewId)
    } catch {
      await retryReviewReplyRefresh(reviewId)
    }
  }
}

function proposedProjection(scan: ValidationResult, decisions: FindingReviewInput[]): ValidationResult {
  return projectEffectiveResult(scan, decisions.map((decision) => ({
    findingKey: decision.findingKey,
    decision: decision.decision,
    proposedSeverity: decision.proposedSeverity,
    approvalStatus: 'approved',
  }))).result
}

function toReply(context: ReviewReplyContext, status: ReviewReply['status']): ReviewReply {
  return {
    reviewId: context.id,
    owner: context.owner,
    repo: context.repo,
    path: context.path,
    issueNumber: context.issueNumber,
    commitSha: context.commitSha,
    originalScore: context.originalScore,
    originalRiskLevel: context.originalRiskLevel,
    proposedRiskLevel: context.proposedRiskLevel,
    status,
    replyCommentId: context.replyCommentId,
    decisions: context.decisions.map((decision) => ({
      findingKey: decision.findingKey,
      decision: decision.decision,
      originalSeverity: decision.originalSeverity,
      proposedSeverity: decision.proposedSeverity,
      confidence: decision.confidence,
      explanation: decision.explanation,
      approvalStatus: decision.approvalStatus,
      evidence: decision.evidence.map((item) => ({ filePath: item.filePath, lineStart: item.lineStart, lineEnd: item.lineEnd })),
    })),
  }
}

function reviewAiConfig(): AiReviewConfig {
  const providerName = process.env.SCAN_REVIEW_AI_PROVIDER?.trim() || 'openai'
  if (!isAiProvider(providerName)) throw permanent('Invalid scan review AI provider')
  const apiKey = {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    'opencode-go': process.env.OPENCODE_GO_API_KEY,
    'opencode-zen': process.env.OPENCODE_ZEN_API_KEY,
    openrouter: process.env.OPENROUTER_API_KEY,
    gemini: process.env.GEMINI_API_KEY,
    'opencode-local': process.env.OPENCODE_LOCAL_PASSWORD,
  }[providerName]?.trim()
  if (providerName !== 'opencode-local' && !apiKey) throw permanent(`Missing API key for ${providerName}`)
  return {
    provider: providerName,
    apiKey,
    model: process.env.SCAN_REVIEW_AI_MODEL?.trim() || undefined,
    localUrl: process.env.OPENCODE_LOCAL_URL?.trim() || undefined,
    localUsername: process.env.OPENCODE_LOCAL_USERNAME?.trim() || undefined,
    redactSecrets: true,
  }
}

function matchesClaimedSource(scan: ValidationResult, review: ReviewProcessingContext): boolean {
  const source = scan.source
  return source?.type === 'github'
    && source.owner?.toLowerCase() === review.owner.toLowerCase()
    && source.repo?.toLowerCase() === review.repo.toLowerCase()
    && source.sha?.toLowerCase() === review.commitSha.toLowerCase()
}

function permanent(message: string): ReviewFailure {
  return Object.assign(new Error(message), { transient: false })
}

function normalizeFailure(error: unknown): { message: string; transient: boolean } {
  const failure = error instanceof Error ? error as ReviewFailure : new Error(String(error)) as ReviewFailure
  const message = failure.message.replace(/[\r\n\t]+/g, ' ').slice(0, 1_000) || 'Unknown scan review error'
  if (typeof failure.transient === 'boolean') return { message, transient: failure.transient }

  // Strict-output, configuration, and immutable-state failures cannot improve on retry.
  const permanentPattern = /^(Invalid|Unknown|Duplicate|Missing (?:adjudication|evidence|stored|API key)|Proposed severity|The immutable|Claimed|Stored|Unsupported|Too many)/i
  return { message, transient: !permanentPattern.test(message) }
}

export type { StoredCandidateClaim }
