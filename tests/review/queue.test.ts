import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ValidationResult } from '@/lib/validator/types'

const store = vi.hoisted(() => ({
  claimQueuedReviews: vi.fn(),
  getReviewProcessingContext: vi.fn(),
  beginReviewEvidenceCollection: vi.fn(),
  saveReviewClaims: vi.fn(),
  saveReviewAdjudication: vi.fn(),
  getReviewReplyContext: vi.fn(),
  persistReviewReply: vi.fn(),
  finishReviewPublication: vi.fn(),
  retryOrFailReview: vi.fn(),
  applyReviewDecisions: vi.fn(),
}))
const model = vi.hoisted(() => ({ extractClaims: vi.fn(), adjudicateClaims: vi.fn() }))
const evidence = vi.hoisted(() => ({ collectEvidence: vi.fn() }))
const githubReply = vi.hoisted(() => vi.fn())
const getResult = vi.hoisted(() => vi.fn())

vi.mock('@/lib/review/store', () => store)
vi.mock('@/lib/review/adjudicator', () => model)
vi.mock('@/lib/review/evidence', () => evidence)
vi.mock('@/lib/github/review-replies', () => ({ publishReviewReply: githubReply }))
vi.mock('@/lib/store', () => ({ getResult }))

import { processQueuedScanReviews } from '@/lib/review/queue'

const key = 'a'.repeat(64)
const scan: ValidationResult = {
  id: 'scan-1', timestamp: '2026-09-04T00:00:00.000Z', skillName: 'reviewer', overallScore: 90, riskLevel: 'critical',
  summary: { totalChecks: 1, passed: 0, warnings: 0, failed: 1, criticalCount: 1, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 },
  axes: [], findings: [{ id: 'f-1', axis: 'security', severity: 'critical', category: 'command-injection', title: 'Pipe to shell', message: 'Review it.' }],
  compatibility: { agents: [], overallCompatibility: 0 }, tokenAnalysis: { totalTokens: 0, frontmatterTokens: 0, bodyTokens: 0, isUnderLimit: true, limit: 1, breakdown: [] },
  skillPreview: { frontmatter: {}, body: '', fileTree: [] },
  source: { type: 'github', owner: 'acme', repo: 'skills', path: 'reviewer', sha: '0123456789012345678901234567890123456789' },
}

const claimed = {
  id: 'review-1', deliveryId: 'delivery-1', scanId: 'scan-1', target: 'acme/skills/reviewer',
  commitSha: scan.source!.sha!, status: 'processing' as const, stage: 'queued' as const,
  attempts: 1, originalScore: 90, originalRiskLevel: 'critical' as const,
}

const processingContext = {
  ...claimed, owner: 'acme', repo: 'skills', path: 'reviewer', issueNumber: 89,
  commentBody: 'Those findings quote documentation.', stageData: null,
}

const decision = {
  findingKey: key, decision: 'false_positive' as const, originalSeverity: 'critical' as const,
  confidence: 95, claim: 'Documentation only.', explanation: 'The command is quoted.', evidence: [],
}

beforeEach(() => {
  process.env.SCAN_REVIEW_AI_PROVIDER = 'openai'
  process.env.OPENAI_API_KEY = 'test-key'
  store.claimQueuedReviews.mockResolvedValue([claimed])
  store.getReviewProcessingContext.mockResolvedValue(processingContext)
  store.beginReviewEvidenceCollection.mockResolvedValue(undefined)
  store.saveReviewClaims.mockResolvedValue(undefined)
  store.saveReviewAdjudication.mockResolvedValue(undefined)
  store.getReviewReplyContext.mockResolvedValue({
    ...processingContext, stage: 'publishing', decisions: [{ ...decision, approvalStatus: 'pending' }], proposedRiskLevel: 'medium',
  })
  store.persistReviewReply.mockResolvedValue(undefined)
  store.finishReviewPublication.mockResolvedValue({ status: 'awaiting_approval', pendingDecisionCount: 1 })
  store.applyReviewDecisions.mockResolvedValue(undefined)
  store.retryOrFailReview.mockResolvedValue('retried')
  model.extractClaims.mockResolvedValue([{ findingKey: key, claim: 'Documentation only.' }])
  evidence.collectEvidence.mockResolvedValue([{ findingKey: key, claim: 'Documentation only.', finding: scan.findings[0], evidence: null }])
  model.adjudicateClaims.mockResolvedValue([decision])
  githubReply.mockResolvedValue({ commentId: 42, created: true })
  getResult.mockResolvedValue(scan)
})

afterEach(() => {
  vi.clearAllMocks()
  delete process.env.SCAN_REVIEW_AI_PROVIDER
  delete process.env.OPENAI_API_KEY
})

describe('scan review queue', () => {
  it('persists every completed stage and publishes one proposal', async () => {
    await expect(processQueuedScanReviews(10)).resolves.toEqual({ claimed: 1, completed: 0, awaitingApproval: 1, retried: 0, failed: 0 })

    expect(store.claimQueuedReviews).toHaveBeenCalledWith(5)
    expect(model.extractClaims).toHaveBeenCalledTimes(1)
    expect(model.adjudicateClaims).toHaveBeenCalledTimes(1)
    expect(store.saveReviewClaims).toHaveBeenCalledBefore(store.saveReviewAdjudication)
    expect(store.saveReviewAdjudication).toHaveBeenCalledBefore(githubReply)
    expect(githubReply).toHaveBeenCalledTimes(1)
    expect(store.persistReviewReply).toHaveBeenCalledWith('review-1', 42)
  })

  it('resumes publication without another AI call', async () => {
    store.claimQueuedReviews.mockResolvedValue([{ ...claimed, stage: 'publishing' }])
    store.getReviewProcessingContext.mockResolvedValue({ ...processingContext, stage: 'publishing' })

    await processQueuedScanReviews()

    expect(model.extractClaims).not.toHaveBeenCalled()
    expect(model.adjudicateClaims).not.toHaveBeenCalled()
    expect(githubReply).toHaveBeenCalledTimes(1)
  })

  it.each([1, 2])('retries a transient failure on attempt %s', async (attempts) => {
    store.claimQueuedReviews.mockResolvedValue([{ ...claimed, attempts }])
    githubReply.mockRejectedValue(Object.assign(new Error('GitHub review reply failed (503)'), { transient: true }))

    await expect(processQueuedScanReviews()).resolves.toMatchObject({ retried: 1, failed: 0 })
    expect(store.retryOrFailReview).toHaveBeenCalledWith('review-1', expect.any(String), true)
  })

  it('fails after the third transient attempt', async () => {
    store.claimQueuedReviews.mockResolvedValue([{ ...claimed, attempts: 3 }])
    store.retryOrFailReview.mockResolvedValue('failed')
    githubReply.mockRejectedValue(Object.assign(new Error('GitHub review reply failed (503)'), { transient: true }))

    await expect(processQueuedScanReviews()).resolves.toMatchObject({ retried: 0, failed: 1 })
  })

  it('fails permanent invalid model output without retrying', async () => {
    model.extractClaims.mockRejectedValue(new Error('Invalid claim extraction JSON'))
    store.retryOrFailReview.mockResolvedValue('failed')

    await expect(processQueuedScanReviews()).resolves.toMatchObject({ retried: 0, failed: 1 })
    expect(store.retryOrFailReview).toHaveBeenCalledWith('review-1', 'Invalid claim extraction JSON', false)
  })

  it('does not double-process work excluded by the database claim', async () => {
    store.claimQueuedReviews.mockResolvedValue([])

    await expect(processQueuedScanReviews()).resolves.toEqual({ claimed: 0, completed: 0, awaitingApproval: 0, retried: 0, failed: 0 })
    expect(model.extractClaims).not.toHaveBeenCalled()
    expect(githubReply).not.toHaveBeenCalled()
  })
})
