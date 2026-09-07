import { describe, expect, it, vi } from 'vitest'
import { formatReviewReply, publishReviewReply, type ReviewReply } from '@/lib/github/review-replies'

const findingKey = 'a'.repeat(64)

function reply(overrides: Partial<ReviewReply> = {}): ReviewReply {
  return {
    reviewId: 'review-1',
    owner: 'acme',
    repo: 'skills',
    path: 'reviewer',
    issueNumber: 89,
    commitSha: '0123456789012345678901234567890123456789',
    originalScore: 90,
    originalRiskLevel: 'critical',
    proposedRiskLevel: 'medium',
    status: 'awaiting_approval',
    decisions: [{
      findingKey,
      decision: 'false_positive',
      originalSeverity: 'critical',
      confidence: 96,
      explanation: '<script>alert(1)</script> This is documentation.',
      approvalStatus: 'pending',
    }],
    ...overrides,
  }
}

describe('review reply formatting', () => {
  it('renders an auditable, escaped proposal without changing the numerical score', () => {
    const body = formatReviewReply(reply(), 'https://shield.example')

    expect(body).toContain('<!-- ai-skill-shield-review:review-1 -->')
    expect(body).toContain('Numerical score remains **90/100**')
    expect(body).toContain('Proposed effective risk: **medium**')
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(body).not.toContain('<script>')
    expect(body).toContain('https://github.com/acme/skills/commit/0123456789012345678901234567890123456789')
    expect(body).toContain('https://shield.example/trust/github/acme/skills/reviewer')
  })

  it('bounds attacker-controlled explanations', () => {
    const body = formatReviewReply(reply({ decisions: [{
      ...reply().decisions[0],
      explanation: 'x'.repeat(5_000),
    }] }))

    expect(body.length).toBeLessThan(4_000)
    expect(body).not.toContain('x'.repeat(1_001))
  })
})

describe('review reply publishing', () => {
  it('creates a reply when no marker exists', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json([{ id: 7, body: 'someone else' }]))
      .mockResolvedValueOnce(Response.json({ id: 42 }))

    await expect(publishReviewReply(reply(), request)).resolves.toEqual({ commentId: 42, created: true })
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1][3]).toMatchObject({ method: 'POST' })
  })

  it('updates the stored comment directly and never searches', async () => {
    const request = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))

    await expect(publishReviewReply(reply({ replyCommentId: 42 }), request)).resolves.toEqual({ commentId: 42, created: false })
    expect(request).toHaveBeenCalledTimes(1)
    expect(request.mock.calls[0][3]).toMatchObject({ method: 'PATCH' })
    expect(request.mock.calls[0][3].body).toContain('ai-skill-shield-review:review-1')
  })

  it('recovers a previously created marker before posting a duplicate', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json([{ id: 73, body: '<!-- ai-skill-shield-review:review-1 -->' }]))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))

    await expect(publishReviewReply(reply(), request)).resolves.toEqual({ commentId: 73, created: false })
    expect(request).toHaveBeenCalledTimes(2)
    expect(request.mock.calls[1][3]).toMatchObject({ method: 'PATCH' })
  })
})
