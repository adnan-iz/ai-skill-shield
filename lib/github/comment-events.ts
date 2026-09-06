import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { createScanReview, recordCommentEvent } from '@/lib/review/store'
import { getResult } from '@/lib/store'
import { normalizeGitHubSkillPath } from '@/lib/trust'
import type { CommentEventInput } from '@/lib/review/types'
import type { ValidationResult } from '@/lib/validator/types'

const MAX_COMMENT_BODY_BYTES = 32 * 1024
const ELIGIBLE_ASSOCIATIONS = new Set(['OWNER', 'MEMBER', 'COLLABORATOR'])

const loginSchema = z.string().trim().min(1).max(100)
const issueCommentEventSchema = z.object({
  action: z.literal('created'),
  repository: z.object({
    name: z.string().trim().min(1).max(100),
    owner: z.object({ login: loginSchema }),
  }),
  issue: z.object({ number: z.number().int().safe().positive() }),
  comment: z.object({
    id: z.number().int().safe().positive(),
    body: z.string(),
    author_association: z.string().trim().min(1).max(32),
    user: z.object({
      login: loginSchema,
      type: z.string().trim().min(1).max(32).optional(),
    }),
  }),
})

export interface IssueCommentEvent {
  action: 'created'
  owner: string
  repo: string
  issueNumber: number
  commentId: number
  commenterLogin: string
  commenterType?: string
  authorAssociation: string
  commentBody: string
}

export type GitHubCommentWebhookResult =
  | { status: 'queued' }
  | { status: 'duplicate' }
  | { status: 'ignored'; reason: 'missing_headers' | 'unsupported_event' | 'invalid_payload' | 'untracked_issue' | 'bot_comment' | 'ineligible_author' | 'scan_unavailable' | 'active_review' }

interface NotificationRow {
  target: string
  owner: string
  repo: string
  path: string
  issue_number: number
  last_sha: string
  last_scan_id: string
}

/** Verifies GitHub's raw-body HMAC without exposing a timing oracle. */
export function verifyGitHubSignature(raw: string, header: string | null, secret: string): boolean {
  if (!/^sha256=[0-9a-f]{64}$/i.test(header || '')) return false
  const expected = createHmac('sha256', secret).update(raw).digest()
  const received = Buffer.from(header!.slice(7), 'hex')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

/** Parses only the bounded fields used by the review queue. GitHub content remains data. */
export function parseIssueCommentEvent(raw: string): IssueCommentEvent | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }

  const parsed = issueCommentEventSchema.safeParse(value)
  if (!parsed.success || Buffer.byteLength(parsed.data.comment.body, 'utf8') > MAX_COMMENT_BODY_BYTES) return null

  return {
    action: parsed.data.action,
    owner: parsed.data.repository.owner.login,
    repo: parsed.data.repository.name,
    issueNumber: parsed.data.issue.number,
    commentId: parsed.data.comment.id,
    commenterLogin: parsed.data.comment.user.login,
    commenterType: parsed.data.comment.user.type,
    authorAssociation: parsed.data.comment.author_association,
    commentBody: parsed.data.comment.body,
  }
}

/**
 * Normalizes the GitHub headers after signature verification and never makes a
 * GitHub or AI request in the synchronous webhook path.
 */
export async function handleGitHubCommentWebhook(raw: string, headers: Headers): Promise<GitHubCommentWebhookResult> {
  const eventName = headers.get('x-github-event')
  const deliveryId = headers.get('x-github-delivery')?.trim()
  if (!eventName || !deliveryId) return { status: 'ignored', reason: 'missing_headers' }
  if (eventName !== 'issue_comment') return { status: 'ignored', reason: 'unsupported_event' }
  if (deliveryId.length > 200) return { status: 'ignored', reason: 'invalid_payload' }

  const event = parseIssueCommentEvent(raw)
  if (!event) return { status: 'ignored', reason: 'invalid_payload' }
  return acceptIssueComment(event, deliveryId)
}

/** Records an eligible comment or its audit-only exclusion, then queues one review. */
export async function acceptIssueComment(event: IssueCommentEvent, deliveryId: string): Promise<GitHubCommentWebhookResult> {
  const notification = await trackedNotification(event)
  if (!notification) return recordIgnored(event, deliveryId, 'untracked_issue')

  if (isBotOrSelfComment(event)) return recordIgnored(event, deliveryId, 'bot_comment')
  if (!ELIGIBLE_ASSOCIATIONS.has(event.authorAssociation)) return recordIgnored(event, deliveryId, 'ineligible_author')

  const scan = await getResult(notification.last_scan_id)
  if (!isTrackedScan(scan, notification)) return recordIgnored(event, deliveryId, 'scan_unavailable')
  if (await hasActiveReview(notification)) return recordIgnored(event, deliveryId, 'active_review')

  const recorded = await recordCommentEvent(commentEventInput(event, deliveryId, 'queued'))
  if (!recorded.inserted) return { status: 'duplicate' }

  await createScanReview({
    deliveryId,
    scanId: scan.id,
    owner: notification.owner,
    repo: notification.repo,
    path: normalizeGitHubSkillPath(notification.path),
    issueNumber: notification.issue_number,
    target: notification.target,
    commitSha: notification.last_sha,
    originalScore: scan.overallScore,
    originalRiskLevel: scan.riskLevel,
    originalSummary: scan.summary,
  })
  return { status: 'queued' }
}

async function trackedNotification(event: IssueCommentEvent): Promise<NotificationRow | null> {
  await ensureDatabase()
  const { client } = getDatabase()
  const result = await client.query<NotificationRow>(
    `SELECT target, owner, repo, path, issue_number, last_sha, last_scan_id
     FROM github_scan_notifications
     WHERE LOWER(owner) = LOWER($1) AND LOWER(repo) = LOWER($2) AND issue_number = $3
     LIMIT 1`,
    [event.owner, event.repo, event.issueNumber]
  )
  return result.rows[0] ?? null
}

/** This is an admission check only; createScanReview remains the race-safe constraint. */
async function hasActiveReview(notification: NotificationRow): Promise<boolean> {
  const { client } = getDatabase()
  const result = await client.query(
    `SELECT 1
     FROM scan_reviews
     WHERE owner = $1 AND repo = $2 AND issue_number = $3
       AND status IN ('queued', 'processing', 'awaiting_approval')
     LIMIT 1`,
    [notification.owner, notification.repo, notification.issue_number]
  )
  return result.rows.length > 0
}

function isBotOrSelfComment(event: IssueCommentEvent): boolean {
  if (event.commenterType?.toLowerCase() === 'bot') return true
  const botLogin = process.env.GITHUB_BOT_LOGIN?.trim()
  return Boolean(botLogin && event.commenterLogin.toLowerCase() === botLogin.toLowerCase())
}

function isTrackedScan(scan: ValidationResult | undefined, notification: NotificationRow): scan is ValidationResult {
  const source = scan?.source
  return Boolean(
    source?.type === 'github' &&
    source.owner?.toLowerCase() === notification.owner.toLowerCase() &&
    source.repo?.toLowerCase() === notification.repo.toLowerCase() &&
    normalizeGitHubSkillPath(source.path) === normalizeGitHubSkillPath(notification.path) &&
    source.sha === notification.last_sha
  )
}

async function recordIgnored(
  event: IssueCommentEvent,
  deliveryId: string,
  reason: Extract<GitHubCommentWebhookResult, { status: 'ignored' }>['reason']
): Promise<GitHubCommentWebhookResult> {
  const recorded = await recordCommentEvent(commentEventInput(event, deliveryId, 'ignored', reason))
  return recorded.inserted ? { status: 'ignored', reason } : { status: 'duplicate' }
}

function commentEventInput(
  event: IssueCommentEvent,
  deliveryId: string,
  status: CommentEventInput['status'],
  ignoreReason?: string
): CommentEventInput {
  return {
    deliveryId,
    eventAction: event.action,
    owner: event.owner,
    repo: event.repo,
    issueNumber: event.issueNumber,
    commentId: event.commentId,
    commenterLogin: event.commenterLogin,
    authorAssociation: event.authorAssociation,
    commentBody: event.commentBody,
    status,
    ignoreReason,
  }
}
