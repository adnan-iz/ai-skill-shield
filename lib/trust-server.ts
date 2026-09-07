import 'server-only'

import { cache } from 'react'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { projectEffectiveResult } from '@/lib/review/projection'
import type { AppliedFindingDecision } from '@/lib/review/projection'
import { getAppliedProjection } from '@/lib/review/store'
import type { DecisionApproval, ReviewDecision, ReviewEvidence, ReviewStatus } from '@/lib/review/types'
import { getLatestGitHubResult, getResult } from '@/lib/store'
import { normalizeGitHubSkillPath, parseGitHubTrustTarget, trustTargetForResult } from '@/lib/trust'
import type { Severity, ValidationResult } from '@/lib/validator/types'

const GITHUB_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/
const FULL_SHA = /^[a-f0-9]{40}$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export interface PublicReviewEvidence { filePath: string; lineStart?: number; lineEnd?: number; excerpt?: string }
export interface PublicReviewDecision {
  findingKey: string
  decision: ReviewDecision
  originalSeverity: Severity
  proposedSeverity?: Severity
  approvalStatus: DecisionApproval
  explanation: string
  evidence: PublicReviewEvidence[]
  aiProposed: true
  humanApproved: boolean
}
export interface PublicReviewSummary {
  id: string
  scanId: string
  status: ReviewStatus
  originalScore: number
  originalRiskLevel: ValidationResult['riskLevel']
  effectiveRiskLevel: ValidationResult['riskLevel']
  proposedRiskLevel: ValidationResult['riskLevel'] | null
  commitSha: string
  createdAt: number
  completedAt: number | null
  challengedCount: number
  confirmedCount: number
  suppressedCount: number
  changedCount: number
  unresolvedCount: number
  commentUrl: string
  commitUrl: string
  decisions: PublicReviewDecision[]
  verifiedRescan?: { id: string; score: number; timestamp: string }
}
export interface PublicTrustReadModel {
  original: ValidationResult
  effective: ValidationResult
  review: PublicReviewSummary | null
  verifiedRescan: ValidationResult | null
}

interface PublicReviewRow {
  id: string; scan_id: string; status: ReviewStatus; owner: string; repo: string; issue_number: number
  commit_sha: string; original_score: number; original_risk_level: ValidationResult['riskLevel']
  proposed_risk_level: ValidationResult['riskLevel'] | null; effective_risk_level: ValidationResult['riskLevel'] | null
  verified_rescan_id: string | null; created_at: number; completed_at: number | null; comment_id: number
}
interface PublicDecisionRow {
  finding_key: string; decision: ReviewDecision; original_severity: Severity; proposed_severity: Severity | null
  approval_status: DecisionApproval; explanation: string; evidence: string
}

async function isPublicGitHubRepository(owner: string, repo: string): Promise<boolean> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers, next: { revalidate: 300 } })
    if (!response.ok) return false
    return ((await response.json()) as { private?: boolean }).private === false
  } catch { return false }
}

export const getPublicTrustResult = cache(async (owner: string, repo: string, path?: string | string[]) => {
  const target = parseGitHubTrustTarget(owner, repo, path)
  if (!target) return undefined
  const result = await getLatestGitHubResult(target.owner, target.repo, target.path)
  if (!result?.source?.sha || result.source.repositoryMeta?.isDefaultBranchHead !== true) return undefined
  if (result.source.repositoryMeta.isPrivate !== false) return undefined
  if (!await isPublicGitHubRepository(target.owner, target.repo)) return undefined
  return result
})

/** Sanitized history: deliberately omits comments, provider data, reviewer identities, and internal errors. */
export const getPublicReviewReadModel = cache(async (scanId: string): Promise<PublicReviewSummary | null> => {
  if (!UUID.test(scanId)) return null
  return loadPublicReview(scanId)
})

async function loadPublicReview(scanId: string, reviewId?: string): Promise<PublicReviewSummary | null> {
  await ensureDatabase()
  const { client } = getDatabase()
  const reviewResult = await client.query<PublicReviewRow>(
    `SELECT review.id, review.scan_id, review.status, review.owner, review.repo, review.issue_number,
            review.commit_sha, review.original_score, review.original_risk_level, review.proposed_risk_level,
            review.effective_risk_level, review.verified_rescan_id, review.created_at, review.completed_at, event.comment_id
     FROM scan_reviews review INNER JOIN github_comment_events event ON event.delivery_id = review.delivery_id
     WHERE review.scan_id = $1 ${reviewId ? 'AND review.id = $2' : ''}
     ORDER BY review.created_at DESC LIMIT 1`, reviewId ? [scanId, reviewId] : [scanId],
  )
  const row = reviewResult.rows[0]
  if (!row || !validReviewIdentity(row)) return null
  const findingResult = await client.query<PublicDecisionRow>(
    `SELECT finding_key, decision, original_severity, proposed_severity, approval_status, explanation, evidence
     FROM finding_reviews WHERE review_id = $1 ORDER BY id`, [row.id],
  )
  const decisions = findingResult.rows.map(publicDecision)
  const applied = row.status === 'completed' && Boolean(row.effective_risk_level)
  return {
    id: row.id, scanId: row.scan_id, status: row.status, originalScore: row.original_score,
    originalRiskLevel: row.original_risk_level,
    effectiveRiskLevel: applied ? row.effective_risk_level! : row.original_risk_level,
    proposedRiskLevel: row.proposed_risk_level, commitSha: row.commit_sha, createdAt: row.created_at,
    completedAt: row.completed_at, challengedCount: decisions.length,
    confirmedCount: decisions.filter((item) => item.decision === 'confirmed').length,
    suppressedCount: applied ? decisions.filter((item) => item.decision === 'false_positive' && item.approvalStatus === 'approved').length : 0,
    changedCount: applied ? decisions.filter((item) => (item.decision === 'severity_reduced' || item.decision === 'severity_increased') && item.approvalStatus === 'approved').length : 0,
    unresolvedCount: decisions.filter((item) => item.decision === 'insufficient_evidence' || item.decision === 'not_related').length,
    commentUrl: `https://github.com/${encodeURIComponent(row.owner)}/${encodeURIComponent(row.repo)}/issues/${row.issue_number}#issuecomment-${row.comment_id}`,
    commitUrl: `https://github.com/${encodeURIComponent(row.owner)}/${encodeURIComponent(row.repo)}/commit/${row.commit_sha}`,
    decisions,
  }
}

export const getPublicTrustReadModel = cache(async (owner: string, repo: string, path?: string | string[]): Promise<PublicTrustReadModel | undefined> => {
  const original = await getPublicTrustResult(owner, repo, path)
  if (!original) return undefined
  const [review, application] = await Promise.all([getPublicReviewReadModel(original.id), getAppliedProjection(original.id)])
  let effective = original
  if (application) {
    const appliedReview = review?.id === application.reviewId ? review : await loadPublicReview(original.id, application.reviewId)
    if (appliedReview) effective = projectEffectiveResult(original, appliedReview.decisions.map(appliedDecision), 'approved').result
  }
  let verifiedRescan: ValidationResult | null = null
  if (application?.verifiedRescanId) {
    const candidate = await getResult(application.verifiedRescanId)
    if (candidate && sameExactSource(original, candidate)) verifiedRescan = candidate
  }
  const currentReview = review ? {
    ...review,
    effectiveRiskLevel: effective.riskLevel,
    ...(verifiedRescan ? { verifiedRescan: { id: verifiedRescan.id, score: verifiedRescan.overallScore, timestamp: verifiedRescan.timestamp } } : {}),
  } : null
  return { original, effective, review: currentReview, verifiedRescan }
})

/** Same visibility gate as the trust page for the public JSON endpoint. */
export const getPublicReviewApiModel = cache(async (scanId: string): Promise<PublicReviewSummary | null> => {
  if (!UUID.test(scanId)) return null
  const original = await getResult(scanId)
  const target = original ? trustTargetForResult(original) : null
  if (!original || !target || !await isPublicGitHubRepository(target.owner, target.repo)) return null
  const model = await getPublicTrustReadModel(target.owner, target.repo, target.path)
  return model?.original.id === scanId ? model.review : null
})

function appliedDecision(item: PublicReviewDecision): AppliedFindingDecision {
  return { findingKey: item.findingKey, decision: item.decision, proposedSeverity: item.proposedSeverity, approvalStatus: item.approvalStatus }
}
function publicDecision(row: PublicDecisionRow): PublicReviewDecision {
  return {
    findingKey: row.finding_key, decision: row.decision, originalSeverity: row.original_severity,
    ...(row.proposed_severity ? { proposedSeverity: row.proposed_severity } : {}), approvalStatus: row.approval_status,
    explanation: row.explanation.slice(0, 1_000), evidence: parsePublicEvidence(row.evidence), aiProposed: true,
    humanApproved: row.approval_status === 'approved',
  }
}
function parsePublicEvidence(value: string): PublicReviewEvidence[] {
  let parsed: unknown
  try { parsed = JSON.parse(value) } catch { return [] }
  if (!Array.isArray(parsed)) return []
  return parsed.slice(0, 10).flatMap((item): PublicReviewEvidence[] => {
    if (!item || typeof item !== 'object') return []
    const evidence = item as Partial<ReviewEvidence>
    if (typeof evidence.filePath !== 'string') return []
    return [{ filePath: evidence.filePath.slice(0, 1_000),
      ...(Number.isSafeInteger(evidence.lineStart) ? { lineStart: evidence.lineStart } : {}),
      ...(Number.isSafeInteger(evidence.lineEnd) ? { lineEnd: evidence.lineEnd } : {}),
      ...(typeof evidence.excerpt === 'string' ? { excerpt: evidence.excerpt.slice(0, 16_384) } : {}) }]
  })
}
function validReviewIdentity(row: PublicReviewRow): boolean {
  return UUID.test(row.id) && UUID.test(row.scan_id) && GITHUB_IDENTIFIER.test(row.owner) && GITHUB_IDENTIFIER.test(row.repo)
    && FULL_SHA.test(row.commit_sha) && Number.isSafeInteger(row.issue_number) && row.issue_number > 0
    && Number.isSafeInteger(row.comment_id) && row.comment_id > 0
}
function sameExactSource(original: ValidationResult, candidate: ValidationResult): boolean {
  const first = original.source
  const second = candidate.source
  return first?.type === 'github' && second?.type === 'github' && Boolean(first.owner && first.repo && first.sha && second.owner && second.repo && second.sha)
    && FULL_SHA.test(first.sha!) && FULL_SHA.test(second.sha!) && first.owner!.toLowerCase() === second.owner!.toLowerCase()
    && first.repo!.toLowerCase() === second.repo!.toLowerCase() && normalizeGitHubSkillPath(first.path) === normalizeGitHubSkillPath(second.path)
    && first.sha!.toLowerCase() === second.sha!.toLowerCase()
}
