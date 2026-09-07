import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import ReviewStatus from '@/components/report/review-status'
import type { PublicReviewSummary } from '@/lib/trust-server'

function completedReview(overrides: Partial<PublicReviewSummary> = {}): PublicReviewSummary {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    scanId: '22222222-2222-4222-8222-222222222222',
    status: 'completed',
    originalScore: 90,
    originalRiskLevel: 'critical',
    effectiveRiskLevel: 'medium',
    proposedRiskLevel: 'medium',
    commitSha: '0123456789012345678901234567890123456789',
    createdAt: 1_788_585_600_000,
    completedAt: 1_788_589_200_000,
    challengedCount: 9,
    confirmedCount: 1,
    suppressedCount: 7,
    changedCount: 1,
    unresolvedCount: 0,
    commentUrl: 'https://github.com/pekral/ai-olympus/issues/89#issuecomment-123',
    commitUrl: 'https://github.com/pekral/ai-olympus/commit/0123456789012345678901234567890123456789',
    decisions: [{
      findingKey: 'a'.repeat(64),
      decision: 'false_positive',
      originalSeverity: 'critical',
      approvalStatus: 'approved',
      explanation: '<script>documentation example</script>',
      evidence: [{ filePath: 'skills/example/SKILL.md', lineStart: 12, lineEnd: 18 }],
      aiProposed: true,
      humanApproved: true,
    }],
    ...overrides,
  }
}

it('renders approved effective state while preserving score provenance', () => {
  const markup = renderToStaticMarkup(<ReviewStatus review={completedReview()} />)

  expect(markup).toContain('Maintainer evidence reviewed')
  expect(markup).toContain('Original risk:')
  expect(markup).toContain('critical')
  expect(markup).toContain('Effective risk:')
  expect(markup).toContain('medium')
  expect(markup).toContain('Score unchanged: 90/100')
  expect(markup).toContain('7 findings suppressed after human approval')
  expect(markup).toContain('View originating GitHub comment')
  expect(markup).toContain('View exact scanned commit')
  expect(markup).not.toContain('<script>documentation example</script>')
  expect(markup).toContain('&lt;script&gt;documentation example&lt;/script&gt;')
})

it('labels an unapplied proposal as pending and unresolved evidence explicitly', () => {
  const markup = renderToStaticMarkup(<ReviewStatus review={completedReview({
    status: 'awaiting_approval',
    effectiveRiskLevel: 'critical',
    proposedRiskLevel: 'medium',
    suppressedCount: 0,
    changedCount: 0,
    unresolvedCount: 2,
    completedAt: null,
    decisions: [],
  })} />)

  expect(markup).toContain('Pending human approval')
  expect(markup).toContain('Effective risk:')
  expect(markup).toContain('critical')
  expect(markup).toContain('Proposed risk:')
  expect(markup).toContain('medium')
  expect(markup).toContain('2 findings have insufficient evidence')
  expect(markup).not.toContain('suppressed after human approval')
})

it('shows a revised score only for a verified same-commit rescan', () => {
  const markup = renderToStaticMarkup(<ReviewStatus review={completedReview({
    verifiedRescan: {
      id: '33333333-3333-4333-8333-333333333333',
      score: 96,
      timestamp: '2026-09-05T14:00:00.000Z',
    },
  })} />)

  expect(markup).toContain('Verified rescan score: 96/100')
  expect(markup).toContain('Original score: 90/100')
  expect(markup).not.toContain('Score unchanged: 90/100')
})
