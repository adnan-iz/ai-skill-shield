import { afterEach, expect, test, vi } from 'vitest'

const decideReview = vi.fn()
class MockReviewServiceError extends Error {
  constructor(message: string, readonly code: 'invalid_input' | 'not_found' | 'conflict') {
    super(message)
  }
}

function mockReviewService() {
  vi.doMock('@/lib/review/service', () => ({ decideReview, ReviewServiceError: MockReviewServiceError }))
}

afterEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.doUnmock('@/lib/review/service')
  delete process.env.SCAN_REVIEW_ADMIN_TOKEN
})

const reviewId = '00000000-0000-4000-8000-000000000010'
const findingReviewId = '00000000-0000-4000-8000-000000000020'

function context(id = reviewId) {
  return { params: Promise.resolve({ id }) }
}

function approvalRequest(body: unknown, token?: string): Request {
  return new Request(`http://localhost/api/scan-reviews/${reviewId}/decisions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
}

test('rejects requests without the configured admin bearer token', async () => {
  mockReviewService()
  process.env.SCAN_REVIEW_ADMIN_TOKEN = 'admin-test-token'
  const { POST } = await import('@/app/api/scan-reviews/[id]/decisions/route')

  const response = await POST(approvalRequest({
    action: 'approve', findingReviewIds: [findingReviewId], reviewer: 'security-team',
  }), context())

  expect(response.status).toBe(401)
  expect(decideReview).not.toHaveBeenCalled()
})

test('strictly validates bounded decision input before calling the service', async () => {
  mockReviewService()
  process.env.SCAN_REVIEW_ADMIN_TOKEN = 'admin-test-token'
  const { POST } = await import('@/app/api/scan-reviews/[id]/decisions/route')

  const response = await POST(approvalRequest({
    action: 'approve',
    findingReviewIds: Array.from({ length: 21 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`),
    reviewer: 'security-team',
    unexpected: true,
  }, 'admin-test-token'), context())

  expect(response.status).toBe(400)
  expect(decideReview).not.toHaveBeenCalled()
})

test('passes an authenticated decision to the review service', async () => {
  const result = { reviewId, status: 'completed', pendingDecisionCount: 0, application: { reviewId } }
  decideReview.mockResolvedValue(result)
  mockReviewService()
  process.env.SCAN_REVIEW_ADMIN_TOKEN = 'admin-test-token'
  const { POST } = await import('@/app/api/scan-reviews/[id]/decisions/route')

  const response = await POST(approvalRequest({
    action: 'approve', findingReviewIds: [findingReviewId], reviewer: 'security-team', notes: 'Evidence checked.',
  }, 'admin-test-token'), context())

  expect(response.status).toBe(200)
  expect(await response.json()).toEqual(result)
  expect(decideReview).toHaveBeenCalledWith({
    reviewId, action: 'approve', findingReviewIds: [findingReviewId], reviewer: 'security-team', notes: 'Evidence checked.',
  })
})

test('accepts an idempotent repeated service result', async () => {
  const application = { reviewId, scanId: 'scan-1', effectiveFindingKeys: [], suppressedFindingKeys: [], effectiveRiskLevel: 'safe' }
  decideReview.mockResolvedValue({ reviewId, status: 'completed', pendingDecisionCount: 0, application })
  mockReviewService()
  process.env.SCAN_REVIEW_ADMIN_TOKEN = 'admin-test-token'
  const { POST } = await import('@/app/api/scan-reviews/[id]/decisions/route')
  const requestBody = { action: 'reject', findingReviewIds: [findingReviewId], reviewer: 'security-team' }

  const first = await POST(approvalRequest(requestBody, 'admin-test-token'), context())
  const second = await POST(approvalRequest(requestBody, 'admin-test-token'), context())

  expect((await first.json()).application.reviewId).toBe((await second.json()).application.reviewId)
  expect(decideReview).toHaveBeenCalledTimes(2)
})
