import { githubPublicUrl, githubRequest } from './app-client'
import { getResult } from '@/lib/store'
import { projectEffectiveResult } from '@/lib/review/projection'
import { getReviewReplyContext } from '@/lib/review/store'
import type { DecisionApproval, ReviewDecision } from '@/lib/review/types'
import type { Severity, ValidationResult } from '@/lib/validator/types'

const GITHUB_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/
const FULL_SHA = /^[a-f0-9]{40}$/i
const MAX_EXPLANATION = 600
const MAX_LISTED_COMMENTS = 100

export interface ReviewReplyDecision {
  findingKey: string
  decision: ReviewDecision
  originalSeverity: Severity
  proposedSeverity?: Severity | null
  confidence: number
  explanation: string
  approvalStatus: DecisionApproval
  evidence?: Array<{ filePath: string; lineStart?: number; lineEnd?: number }>
}

export interface ReviewReply {
  reviewId: string
  owner: string
  repo: string
  path: string
  issueNumber: number
  commitSha: string
  originalScore: number
  originalRiskLevel: ValidationResult['riskLevel']
  proposedRiskLevel: ValidationResult['riskLevel']
  status: 'awaiting_approval' | 'completed'
  decisions: ReviewReplyDecision[]
  replyCommentId?: number | null
}

export interface PublishReviewReplyResult {
  commentId: number
  created: boolean
}

type GitHubRequest = typeof githubRequest

export class GitHubReviewReplyError extends Error {
  readonly transient: boolean

  constructor(message: string, transient: boolean) {
    super(message)
    this.name = 'GitHubReviewReplyError'
    this.transient = transient
  }
}

function escapeMarkdown(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

/** Prevents links, mentions, issue references, HTML, and formatting in model prose. */
function neutralizeModelMarkdown(value: string): string {
  return escapeMarkdown(value
    .replace(/([\\`*_[\]{}()#+\-.!|>])/g, '\\$1'))
    .replaceAll('@', '&#64;')
    .replaceAll('://', ':&#47;&#47;')
}

function bounded(value: string, limit = MAX_EXPLANATION): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length <= limit ? normalized : `${normalized.slice(0, limit - 1)}…`
}

function assertTrustedIdentity(review: ReviewReply): void {
  if (!/^[A-Za-z0-9-]{1,100}$/.test(review.reviewId)) throw new Error('Invalid scan review identity')
  if (!GITHUB_IDENTIFIER.test(review.owner) || !GITHUB_IDENTIFIER.test(review.repo)) throw new Error('Invalid GitHub repository identity')
  if (!FULL_SHA.test(review.commitSha)) throw new Error('Invalid reviewed commit SHA')
  if (review.path && !trustedFilePath(review.path)) throw new Error('Invalid reviewed repository path')
  if (!Number.isSafeInteger(review.issueNumber) || review.issueNumber < 1) throw new Error('Invalid GitHub issue number')
  if (review.replyCommentId != null && (!Number.isSafeInteger(review.replyCommentId) || review.replyCommentId < 1)) throw new Error('Invalid GitHub reply comment id')
}

function trustedFilePath(value: string): string | null {
  const normalized = value.replaceAll('\\', '/')
  if (!normalized || normalized.length > 1_000 || normalized.startsWith('/') || normalized.includes('//')) return null
  const parts = normalized.split('/')
  return parts.some((part) => !part || part === '.' || part === '..') ? null : parts.join('/')
}

function decisionLabel(decision: ReviewReplyDecision): string {
  const severity = decision.proposedSeverity && (decision.decision === 'severity_reduced' || decision.decision === 'severity_increased')
    ? `${decision.originalSeverity} → ${decision.proposedSeverity}`
    : decision.originalSeverity
  const approval = decision.approvalStatus === 'pending' ? 'human approval pending' : decision.approvalStatus.replaceAll('_', ' ')
  return `**${escapeMarkdown(decision.decision.replaceAll('_', ' '))}** · ${escapeMarkdown(severity)} · ${decision.confidence}% confidence · ${escapeMarkdown(approval)}`
}

function evidenceLinks(review: ReviewReply, decision: ReviewReplyDecision): string {
  const links = (decision.evidence ?? []).slice(0, 1).flatMap((evidence) => {
    const path = trustedFilePath(evidence.filePath)
    if (!path) return []
    const start = Number.isSafeInteger(evidence.lineStart) && Number(evidence.lineStart) > 0 ? Number(evidence.lineStart) : null
    const end = Number.isSafeInteger(evidence.lineEnd) && Number(evidence.lineEnd) >= (start ?? 1) ? Number(evidence.lineEnd) : start
    const anchor = start ? `#L${start}${end && end !== start ? `-L${end}` : ''}` : ''
    const urlPath = path.split('/').map(encodeURIComponent).join('/')
    const url = `https://github.com/${encodeURIComponent(review.owner)}/${encodeURIComponent(review.repo)}/blob/${review.commitSha}/${urlPath}${anchor}`
    const location = bounded(`${path}${start ? `:${start}${end && end !== start ? `-${end}` : ''}` : ''}`, 240)
    return [`[${neutralizeModelMarkdown(location)}](${url})`]
  })
  return links.length ? `\n  Evidence: ${links.join(', ')}` : ''
}

function decisionCounts(decisions: ReviewReplyDecision[]): string {
  const counts = new Map<ReviewDecision, number>()
  for (const decision of decisions.slice(0, 20)) counts.set(decision.decision, (counts.get(decision.decision) ?? 0) + 1)
  return [...counts].map(([decision, count]) => `${count} ${decision.replaceAll('_', ' ')}`).join(' · ')
}

/** Formats only application-constructed links and escapes all model-controlled prose. */
export function formatReviewReply(review: ReviewReply, publicUrl = githubPublicUrl()): string {
  assertTrustedIdentity(review)
  const marker = `<!-- ai-skill-shield-review:${escapeMarkdown(review.reviewId)} -->`
  const normalizedPath = review.path.replaceAll('\\', '/').split('/').filter(Boolean).map(encodeURIComponent).join('/')
  const reportUrl = `${publicUrl.replace(/\/$/, '')}/trust/github/${encodeURIComponent(review.owner)}/${encodeURIComponent(review.repo)}${normalizedPath ? `/${normalizedPath}` : ''}`
  const commitUrl = `https://github.com/${encodeURIComponent(review.owner)}/${encodeURIComponent(review.repo)}/commit/${review.commitSha}`
  const completed = review.status === 'completed'
  const state = completed ? 'Decision applied' : 'Maintainer evidence reviewed — human approval pending'
  const boundedDecisions = review.decisions.slice(0, 20)
  const decisions = boundedDecisions.length === 0
    ? '_No scan finding was specifically challenged by this comment._'
    : boundedDecisions.map((item) => `- ${decisionLabel(item)}\n  ${neutralizeModelMarkdown(bounded(item.explanation))}${evidenceLinks(review, item)}`).join('\n')
  const counts = boundedDecisions.length ? `Reviewed **${boundedDecisions.length}** challenged finding${boundedDecisions.length === 1 ? '' : 's'}: ${escapeMarkdown(decisionCounts(boundedDecisions))}.\n\n` : ''

  return `${marker}
## AI Skill Shield evidence review

**${state}.** The maintainer comment was checked against the files at the exact scanned commit.

- Original risk: **${review.originalRiskLevel}**
- ${completed ? 'Effective' : 'Proposed effective'} risk: **${review.proposedRiskLevel}**
- Numerical score remains **${review.originalScore}/100**. This appeal does not adjust the numerical validation score; only a verified same-commit rescan can do that.

### Finding decisions

${counts}${decisions}

[View the scan report](${reportUrl}) · [View the exact scanned commit](${commitUrl})

_AI output is a proposal until required decisions receive human approval. The original scan remains immutable._`
}

function commentsPath(review: ReviewReply): string {
  const base = `/repos/${encodeURIComponent(review.owner)}/${encodeURIComponent(review.repo)}`
  return `${base}/issues/${review.issueNumber}/comments`
}

async function checked(response: Response, operation: string): Promise<Response> {
  if (response.ok) return response
  const transient = response.status === 408 || response.status === 409 || response.status === 429 || response.status >= 500
  throw new GitHubReviewReplyError(`GitHub review reply ${operation} failed (${response.status})`, transient)
}

async function updateComment(review: ReviewReply, commentId: number, body: string, request: GitHubRequest): Promise<PublishReviewReplyResult> {
  const path = `/repos/${encodeURIComponent(review.owner)}/${encodeURIComponent(review.repo)}/issues/comments/${commentId}`
  await checked(await request(review.owner, review.repo, path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  }), 'update')
  return { commentId, created: false }
}

/** Creates one marker-addressed comment or updates the already persisted/recovered comment. */
export async function publishReviewReply(review: ReviewReply, request: GitHubRequest = githubRequest): Promise<PublishReviewReplyResult> {
  assertTrustedIdentity(review)
  const body = formatReviewReply(review)
  if (review.replyCommentId) return updateComment(review, review.replyCommentId, body, request)

  const marker = `<!-- ai-skill-shield-review:${review.reviewId} -->`
  const listed = await checked(await request(
    review.owner,
    review.repo,
    `${commentsPath(review)}?per_page=${MAX_LISTED_COMMENTS}&sort=created&direction=desc`,
  ), 'lookup')
  let comments: unknown
  try {
    comments = await listed.json()
  } catch {
    throw new GitHubReviewReplyError('GitHub review reply lookup returned invalid JSON', false)
  }
  if (!Array.isArray(comments)) throw new GitHubReviewReplyError('GitHub review reply lookup returned an invalid payload', false)
  const existing = comments.find((value): value is { id: number; body: string } => Boolean(
    value && typeof value === 'object' && Number.isSafeInteger((value as { id?: unknown }).id) &&
    typeof (value as { body?: unknown }).body === 'string' && (value as { body: string }).body.includes(marker),
  ))
  if (existing) return updateComment(review, existing.id, body, request)

  const created = await checked(await request(review.owner, review.repo, commentsPath(review), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ body }),
  }), 'creation')
  let payload: unknown
  try {
    payload = await created.json()
  } catch {
    throw new GitHubReviewReplyError('GitHub review reply creation returned invalid JSON', false)
  }
  const commentId = payload && typeof payload === 'object' ? (payload as { id?: unknown }).id : undefined
  if (!Number.isSafeInteger(commentId) || Number(commentId) < 1) throw new GitHubReviewReplyError('GitHub review reply creation returned no comment id', false)
  return { commentId: Number(commentId), created: true }
}

/** Re-renders the stored comment after a human approval or rejection. */
export async function refreshReviewReply(reviewId: string): Promise<void> {
  const context = await getReviewReplyContext(reviewId)
  if (!context?.replyCommentId) return
  const scan = await getResult(context.scanId)
  if (!scan) throw new Error('Reviewed scan is unavailable')
  const effective = projectEffectiveResult(scan, context.decisions.map((decision) => ({
    findingKey: decision.findingKey,
    decision: decision.decision,
    proposedSeverity: decision.proposedSeverity,
    approvalStatus: context.status === 'awaiting_approval' && decision.approvalStatus === 'pending'
      ? 'approved'
      : decision.approvalStatus,
  }))).result
  await publishReviewReply({
    reviewId: context.id,
    owner: context.owner,
    repo: context.repo,
    path: context.path,
    issueNumber: context.issueNumber,
    commitSha: context.commitSha,
    originalScore: context.originalScore,
    originalRiskLevel: context.originalRiskLevel,
    status: context.status === 'completed' ? 'completed' : 'awaiting_approval',
    proposedRiskLevel: effective.riskLevel,
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
  })
}
