import type { Severity, ValidationResult, ValidationSummary } from '@/lib/validator/types'

export const REVIEW_DECISIONS = [
  'confirmed', 'false_positive', 'severity_reduced', 'severity_increased',
  'fixed_after_scan', 'insufficient_evidence', 'not_related',
] as const

export type ReviewDecision = typeof REVIEW_DECISIONS[number]
export type ReviewStatus = 'queued' | 'processing' | 'awaiting_approval' | 'completed' | 'failed'
export type ReviewStage = 'queued' | 'collecting_evidence' | 'adjudicating' | 'publishing' | 'done'
export type DecisionApproval = 'not_required' | 'pending' | 'approved' | 'rejected'
export type CommentEventStatus = 'ignored' | 'queued' | 'processing' | 'completed' | 'failed'

export interface ReviewEvidence {
  filePath: string
  lineStart?: number
  lineEnd?: number
  excerpt: string
}

export interface CommentEventInput {
  deliveryId: string
  eventAction: string
  owner: string
  repo: string
  issueNumber: number
  commentId: number
  commenterLogin: string
  authorAssociation: string
  commentBody: string
  status: CommentEventStatus
  ignoreReason?: string
}

export interface NewScanReview {
  deliveryId: string
  scanId: string
  target: string
  commitSha: string
  originalScore: number
  originalRiskLevel: ValidationResult['riskLevel']
  runAt?: number
  promptVersion?: string
}

export interface ClaimedReview {
  id: string
  deliveryId: string
  scanId: string
  target: string
  commitSha: string
  status: 'processing'
  stage: ReviewStage
  attempts: number
  originalScore: number
  originalRiskLevel: ValidationResult['riskLevel']
}

export interface FindingReviewInput {
  findingKey: string
  decision: ReviewDecision
  originalSeverity: Severity
  proposedSeverity?: Severity
  confidence: number
  claim: string
  explanation: string
  evidence: ReviewEvidence[]
}

export interface ApplyReviewInput {
  reviewId: string
  effectiveFindingKeys: string[]
  suppressedFindingKeys: string[]
  effectiveRiskLevel: ValidationResult['riskLevel']
  effectiveSummary: ValidationSummary
  appliedBy: string
  reason: string
  verifiedRescanId?: string
}

export interface ReviewProjection {
  reviewId: string
  scanId: string
  effectiveFindingKeys: string[]
  suppressedFindingKeys: string[]
  effectiveRiskLevel: ValidationResult['riskLevel']
  effectiveSummary: ValidationSummary
  verifiedRescanId?: string
}
