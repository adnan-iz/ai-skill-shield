import { randomUUID } from 'node:crypto'
import { afterEach, expect, test, vi } from 'vitest'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

afterEach(async () => {
  vi.resetModules()
  delete process.env.DATABASE_URL
})

test('loads the review store without requiring database configuration', async () => {
  await expect(import('@/lib/review/store')).resolves.toBeDefined()
})

test.skipIf(!testDatabaseUrl)('records a GitHub comment delivery only once', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { recordCommentEvent } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()
  const deliveryId = randomUUID()

  const input = {
    deliveryId,
    eventAction: 'created',
    owner: 'openai',
    repo: 'skills',
    issueNumber: 42,
    commentId: 101,
    commenterLogin: 'maintainer',
    authorAssociation: 'OWNER',
    commentBody: 'This finding is documentation only.',
    status: 'queued' as const,
  }

  try {
    expect(await recordCommentEvent(input)).toEqual({ inserted: true })
    expect(await recordCommentEvent(input)).toEqual({ inserted: false })
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('claims each due review once and persists an applied projection idempotently', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { applyReviewDecisions, claimQueuedReviews, createScanReview, getAppliedProjection } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()
  const deliveryId = randomUUID()
  const scanId = randomUUID()

  try {
    const reviewId = await createScanReview({
      deliveryId,
      scanId,
      target: 'openai/skills/reviewer',
      commitSha: '0123456789012345678901234567890123456789',
      originalScore: 90,
      originalRiskLevel: 'high',
    })

    expect((await claimQueuedReviews()).map((review) => review.id)).toContain(reviewId)
    expect((await claimQueuedReviews()).map((review) => review.id)).not.toContain(reviewId)
    await client.query("UPDATE scan_reviews SET status = 'awaiting_approval' WHERE id = $1", [reviewId])

    const input = {
      reviewId,
      effectiveFindingKeys: ['finding-1'],
      suppressedFindingKeys: [],
      effectiveRiskLevel: 'high' as const,
      effectiveSummary: { totalChecks: 1, passed: 0, warnings: 0, failed: 1, criticalCount: 0, highCount: 1, mediumCount: 0, lowCount: 0, infoCount: 0 },
      appliedBy: 'reviewer',
      reason: 'Approved evidence review.',
    }
    const first = await applyReviewDecisions(input)
    const duplicate = await applyReviewDecisions(input)

    expect(first).toEqual(duplicate)
    expect(await getAppliedProjection(scanId)).toEqual(first)
  } finally {
    await client.end()
  }
})
