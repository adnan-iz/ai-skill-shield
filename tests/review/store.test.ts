import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { afterEach, expect, test, vi } from 'vitest'
import type { ValidationResult } from '@/lib/validator/types'

const testDatabaseUrl = process.env.TEST_DATABASE_URL

afterEach(async () => {
  vi.resetModules()
  delete process.env.DATABASE_URL
})

test('loads the review store without requiring database configuration', async () => {
  await expect(import('@/lib/review/store')).resolves.toBeDefined()
})

test('exposes one atomic operation for a comment event and review creation', async () => {
  const store = await import('@/lib/review/store')
  expect(store.recordCommentEventAndCreateScanReview).toBeTypeOf('function')
})

test('registers scan appeal migrations in the Drizzle journal', () => {
  const journal = JSON.parse(readFileSync('drizzle/meta/_journal.json', 'utf8')) as { entries: Array<{ tag: string }> }
  expect(journal.entries.map((entry) => entry.tag)).toContain('0001_scan_appeal_reviews')
  expect(journal.entries.map((entry) => entry.tag)).toContain('0002_scan_review_issue_identity')
})

function reviewInput(overrides: Partial<{
  deliveryId: string
  scanId: string
  owner: string
  repo: string
  path: string
  issueNumber: number
  originalScore: number
  originalRiskLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe'
  originalSummary: ValidationResult['summary']
}> = {}) {
  return {
    deliveryId: overrides.deliveryId ?? randomUUID(),
    scanId: overrides.scanId ?? randomUUID(),
    owner: overrides.owner ?? 'openai',
    repo: overrides.repo ?? 'skills',
    path: overrides.path ?? 'reviewer',
    issueNumber: overrides.issueNumber ?? 42,
    target: 'openai/skills/reviewer',
    commitSha: '0123456789012345678901234567890123456789',
    originalScore: overrides.originalScore ?? 90,
    originalRiskLevel: overrides.originalRiskLevel ?? 'high',
    originalSummary: overrides.originalSummary ?? {
      totalChecks: 1, passed: 0, warnings: 0, failed: 1,
      criticalCount: 0, highCount: 1, mediumCount: 0, lowCount: 0, infoCount: 0,
    },
  }
}

function commentEventInput(deliveryId: string, issueNumber: number, commentId: number) {
  return {
    deliveryId,
    eventAction: 'created',
    owner: 'openai',
    repo: 'skills',
    issueNumber,
    commentId,
    commenterLogin: 'maintainer',
    authorAssociation: 'OWNER',
    commentBody: 'This finding is documentation only.',
    status: 'queued' as const,
  }
}

function decision(findingKey = 'finding-1') {
  return {
    findingKey,
    decision: 'false_positive' as const,
    originalSeverity: 'high' as const,
    confidence: 90,
    claim: 'This is documentation.',
    explanation: 'The exact source is an example.',
    evidence: [{ filePath: 'SKILL.md', lineStart: 1, excerpt: '# Example' }],
  }
}

function validationResult(id: string, path = 'reviewer', sha = '0123456789012345678901234567890123456789'): ValidationResult {
  return {
    id,
    timestamp: '2026-09-05T00:00:00.000Z',
    skillName: 'reviewer',
    overallScore: 90,
    riskLevel: 'high',
    summary: { totalChecks: 1, passed: 0, warnings: 0, failed: 1, criticalCount: 0, highCount: 1, mediumCount: 0, lowCount: 0, infoCount: 0 },
    axes: [], findings: [],
    compatibility: { agents: [], overallCompatibility: 100 },
    tokenAnalysis: { totalTokens: 1, frontmatterTokens: 0, bodyTokens: 1, isUnderLimit: true, limit: 100, breakdown: [] },
    skillPreview: { frontmatter: {}, body: '', fileTree: [] },
    source: {
      type: 'github', owner: 'openai', repo: 'skills', path, sha,
      repositoryMeta: { fullName: 'openai/skills', isPrivate: false, stars: 1, forks: 1, openIssues: 0, archived: false },
    },
  }
}

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

test.skipIf(!testDatabaseUrl)('atomically queues one of two concurrent deliveries for the same active issue', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { recordCommentEventAndCreateScanReview } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()
  const issueNumber = 100_000_000 + Math.floor(Math.random() * 100_000_000)
  const firstDelivery = randomUUID()
  const secondDelivery = randomUUID()

  try {
    const [first, second] = await Promise.all([
      recordCommentEventAndCreateScanReview(commentEventInput(firstDelivery, issueNumber, issueNumber * 10 + 1), reviewInput({ deliveryId: firstDelivery, issueNumber })),
      recordCommentEventAndCreateScanReview(commentEventInput(secondDelivery, issueNumber, issueNumber * 10 + 2), reviewInput({ deliveryId: secondDelivery, issueNumber })),
    ])

    expect([first.status, second.status].sort()).toEqual(['ignored', 'queued'])
    const events = await client.query<{ status: string; ignore_reason: string | null }>(
      'SELECT status, ignore_reason FROM github_comment_events WHERE delivery_id = ANY($1::text[]) ORDER BY delivery_id',
      [[firstDelivery, secondDelivery]]
    )
    expect(events.rows).toEqual(expect.arrayContaining([
      { status: 'queued', ignore_reason: null },
      { status: 'ignored', ignore_reason: 'active_review' },
    ]))
    const reviews = await client.query<{ count: number }>(
      'SELECT COUNT(*)::INTEGER AS count FROM scan_reviews WHERE owner = $1 AND repo = $2 AND issue_number = $3',
      ['openai', 'skills', issueNumber]
    )
    expect(reviews.rows[0]?.count).toBe(1)
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('rolls back the event when review insertion fails so the delivery can retry', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { recordCommentEvent, recordCommentEventAndCreateScanReview } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()
  const issueNumber = 300_000_000 + Math.floor(Math.random() * 100_000_000)
  const deliveryId = randomUUID()
  const event = commentEventInput(deliveryId, issueNumber, issueNumber * 10 + 1)

  try {
    await expect(recordCommentEventAndCreateScanReview(event, {
      ...reviewInput({ deliveryId, issueNumber }),
      originalScore: null as unknown as number,
    })).rejects.toThrow()
    expect(await recordCommentEvent(event)).toEqual({ inserted: true })
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
      ...reviewInput({ deliveryId, scanId }),
    })

    expect((await claimQueuedReviews()).map((review) => review.id)).toContain(reviewId)
    expect((await claimQueuedReviews()).map((review) => review.id)).not.toContain(reviewId)
    await client.query("UPDATE scan_reviews SET status = 'awaiting_approval' WHERE id = $1", [reviewId])

    await (await import('@/lib/review/store')).replaceFindingReviews(reviewId, [{ ...decision(), decision: 'confirmed' }])
    const input = { reviewId, appliedBy: 'reviewer', reason: 'Approved evidence review.' }
    const first = await applyReviewDecisions(input)
    const duplicate = await applyReviewDecisions(input)

    expect(first).toEqual(duplicate)
    expect(await getAppliedProjection(scanId)).toEqual(first)
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('does not rewrite finding decisions after a review has been applied', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { applyReviewDecisions, claimQueuedReviews, createScanReview, replaceFindingReviews } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()

  try {
    const reviewId = await createScanReview(reviewInput())
    await claimQueuedReviews()
    await replaceFindingReviews(reviewId, [decision()])
    await client.query("UPDATE finding_reviews SET approval_status = 'approved' WHERE review_id = $1", [reviewId])
    await client.query("UPDATE scan_reviews SET status = 'awaiting_approval' WHERE id = $1", [reviewId])
    await applyReviewDecisions({ reviewId, appliedBy: 'reviewer', reason: 'Approved.' })

    await expect(replaceFindingReviews(reviewId, [{ ...decision(), findingKey: 'rewritten' }]))
      .rejects.toThrow('processing')
    const stored = await client.query('SELECT finding_key FROM finding_reviews WHERE review_id = $1', [reviewId])
    expect(stored.rows.map((row) => row.finding_key)).toEqual(['finding-1'])
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('keeps replacement atomic when a duplicate finding key is rejected', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { claimQueuedReviews, createScanReview, replaceFindingReviews } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()

  try {
    const reviewId = await createScanReview(reviewInput())
    await claimQueuedReviews()
    await replaceFindingReviews(reviewId, [{ ...decision(), decision: 'confirmed' }])
    await expect(replaceFindingReviews(reviewId, [decision('duplicate'), decision('duplicate')])).rejects.toThrow('Duplicate')
    const stored = await client.query('SELECT finding_key FROM finding_reviews WHERE review_id = $1', [reviewId])
    expect(stored.rows.map((row) => row.finding_key)).toEqual(['finding-1'])
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('derives an applied projection only from approved finding decisions', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { applyReviewDecisions, claimQueuedReviews, createScanReview, replaceFindingReviews } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()

  try {
    const reviewId = await createScanReview(reviewInput())
    await claimQueuedReviews()
    await replaceFindingReviews(reviewId, [decision()])
    await client.query("UPDATE finding_reviews SET approval_status = 'approved' WHERE review_id = $1", [reviewId])
    await client.query("UPDATE scan_reviews SET status = 'awaiting_approval' WHERE id = $1", [reviewId])

    await expect(applyReviewDecisions({ reviewId, appliedBy: 'reviewer', reason: 'Approved.' })).resolves.toMatchObject({
      effectiveFindingKeys: [],
      suppressedFindingKeys: ['finding-1'],
      effectiveRiskLevel: 'safe',
      effectiveSummary: { highCount: 0 },
    })
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('rejects pending decisions rather than applying an unapproved projection', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { applyReviewDecisions, claimQueuedReviews, createScanReview, replaceFindingReviews } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()

  try {
    const reviewId = await createScanReview(reviewInput())
    await claimQueuedReviews()
    await replaceFindingReviews(reviewId, [decision()])
    await client.query("UPDATE scan_reviews SET status = 'awaiting_approval' WHERE id = $1", [reviewId])
    await expect(applyReviewDecisions({ reviewId, appliedBy: 'reviewer', reason: 'Not ready.' }))
      .rejects.toThrow('pending approval')
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('limits a review to twenty finding candidates', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { claimQueuedReviews, createScanReview, replaceFindingReviews } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()

  try {
    const reviewId = await createScanReview(reviewInput())
    await claimQueuedReviews()
    await expect(replaceFindingReviews(reviewId, Array.from({ length: 21 }, (_, index) => decision(`finding-${index}`))))
      .rejects.toThrow('20')
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('returns the active review for a duplicate scan issue', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { createScanReview } = await import('@/lib/review/store')
  const { client } = (await import('@/lib/db')).getDatabase()

  try {
    const first = await createScanReview(reviewInput())
    const duplicate = await createScanReview(reviewInput())
    expect(duplicate).toBe(first)
  } finally {
    await client.end()
  }
})

test.skipIf(!testDatabaseUrl)('links only a same-source full-SHA rescan', async () => {
  process.env.DATABASE_URL = testDatabaseUrl
  const { createScanReview, linkVerifiedRescan } = await import('@/lib/review/store')
  const { saveResult } = await import('@/lib/store')
  const { client } = (await import('@/lib/db')).getDatabase()
  const scanId = randomUUID()

  try {
    await saveResult(validationResult(scanId))
    const reviewId = await createScanReview(reviewInput({ scanId }))
    await expect(linkVerifiedRescan(reviewId, scanId)).resolves.toEqual({ linked: false, reason: 'source_mismatch' })
    const otherPathId = randomUUID()
    await saveResult(validationResult(otherPathId, 'other-reviewer'))
    await expect(linkVerifiedRescan(reviewId, otherPathId)).resolves.toEqual({ linked: false, reason: 'source_mismatch' })

    const matchingId = randomUUID()
    await saveResult(validationResult(matchingId))
    await expect(linkVerifiedRescan(reviewId, matchingId)).resolves.toEqual({ linked: true })
  } finally {
    await client.end()
  }
})
