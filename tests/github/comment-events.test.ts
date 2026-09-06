import { afterEach, expect, test, vi } from 'vitest'

const recordCommentEvent = vi.fn()
const recordCommentEventAndCreateScanReview = vi.fn()
const getResult = vi.fn()
const query = vi.fn()

vi.mock('@/lib/review/store', () => ({ recordCommentEvent, recordCommentEventAndCreateScanReview }))
vi.mock('@/lib/store', () => ({ getResult }))
vi.mock('@/lib/db', () => ({ ensureDatabase: async () => {}, getDatabase: () => ({ client: { query } }) }))

afterEach(() => {
  vi.resetAllMocks()
})

function payload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    action: 'created',
    repository: { name: 'skills', owner: { login: 'openai' } },
    issue: { number: 42 },
    comment: {
      id: 101,
      body: 'The cited command is documentation, not an instruction.',
      author_association: 'OWNER',
      user: { login: 'maintainer', type: 'User' },
    },
    sender: { login: 'maintainer', type: 'User' },
    ...overrides,
  })
}

function trackedNotification() {
  return {
    target: 'openai/skills/reviewer', owner: 'openai', repo: 'skills', path: 'reviewer',
    issue_number: 42, last_sha: '0123456789012345678901234567890123456789', last_scan_id: 'scan-1',
  }
}

function matchingScan() {
  return {
    id: 'scan-1', overallScore: 90, riskLevel: 'high',
    summary: { totalChecks: 1, passed: 0, warnings: 0, failed: 1, criticalCount: 0, highCount: 1, mediumCount: 0, lowCount: 0, infoCount: 0 },
    source: {
      type: 'github', owner: 'openai', repo: 'skills', path: 'reviewer',
      sha: '0123456789012345678901234567890123456789',
    },
  }
}

test('normalizes a created issue comment without interpreting its content', async () => {
  const { parseIssueCommentEvent } = await import('@/lib/github/comment-events')

  expect(parseIssueCommentEvent(payload())).toMatchObject({
    action: 'created', owner: 'openai', repo: 'skills', issueNumber: 42,
    commentId: 101, commenterLogin: 'maintainer', authorAssociation: 'OWNER',
    commentBody: 'The cited command is documentation, not an instruction.', commenterType: 'User',
  })
})

test('rejects unsupported events, actions, and comments over 32 KiB', async () => {
  const { parseIssueCommentEvent } = await import('@/lib/github/comment-events')

  expect(parseIssueCommentEvent(payload({ action: 'edited' }))).toBeNull()
  expect(parseIssueCommentEvent(payload({ action: 'created', repository: { name: 'skills', owner: { login: 'openai' } }, comment: { id: 101, body: 'x'.repeat(32 * 1024 + 1), author_association: 'OWNER', user: { login: 'maintainer', type: 'User' } } }))).toBeNull()
  expect(parseIssueCommentEvent('{not-json')).toBeNull()
})

test('queues one eligible comment on its tracked scan issue and returns an atomic duplicate', async () => {
  const { acceptIssueComment, parseIssueCommentEvent } = await import('@/lib/github/comment-events')
  const event = parseIssueCommentEvent(payload())
  if (!event) throw new Error('fixture did not parse')
  query
    .mockResolvedValue({ rows: [trackedNotification()] })
  getResult.mockResolvedValue(matchingScan())
  recordCommentEventAndCreateScanReview
    .mockResolvedValueOnce({ status: 'queued', reviewId: 'review-1' })
    .mockResolvedValueOnce({ status: 'duplicate' })

  expect(await acceptIssueComment(event, 'delivery-1')).toEqual({ status: 'queued' })
  expect(await acceptIssueComment(event, 'delivery-1')).toEqual({ status: 'duplicate' })
})

test('records an eligible comment as active-review ignored through the atomic queue operation', async () => {
  const { acceptIssueComment, parseIssueCommentEvent } = await import('@/lib/github/comment-events')
  const event = parseIssueCommentEvent(payload())
  if (!event) throw new Error('fixture did not parse')
  query.mockResolvedValueOnce({ rows: [trackedNotification()] })
  getResult.mockResolvedValue(matchingScan())
  recordCommentEventAndCreateScanReview.mockResolvedValue({ status: 'ignored', reason: 'active_review' })

  expect(await acceptIssueComment(event, 'active-review-delivery')).toEqual({ status: 'ignored', reason: 'active_review' })
})

test('records but does not queue untracked, bot, ineligible, or unavailable scan comments', async () => {
  const { acceptIssueComment, parseIssueCommentEvent } = await import('@/lib/github/comment-events')
  const ownerEvent = parseIssueCommentEvent(payload())
  const botEvent = parseIssueCommentEvent(payload({ comment: { id: 101, body: 'loop', author_association: 'OWNER', user: { login: 'skill-shield[bot]', type: 'Bot' } } }))
  const selfEvent = parseIssueCommentEvent(payload({ comment: { id: 102, body: 'loop', author_association: 'OWNER', user: { login: 'ai-skill-shield', type: 'User' } } }))
  const senderBotEvent = parseIssueCommentEvent(payload({ sender: { login: 'ai-skill-shield[bot]', type: 'Bot' } }))
  const contributorEvent = parseIssueCommentEvent(payload({ comment: { id: 101, body: 'appeal', author_association: 'CONTRIBUTOR', user: { login: 'contributor', type: 'User' } } }))
  if (!ownerEvent || !botEvent || !selfEvent || !senderBotEvent || !contributorEvent) throw new Error('fixture did not parse')
  recordCommentEvent.mockResolvedValue({ inserted: true })

  query.mockResolvedValueOnce({ rows: [] })
  expect(await acceptIssueComment(ownerEvent, 'untracked')).toEqual({ status: 'ignored', reason: 'untracked_issue' })

  query.mockResolvedValueOnce({ rows: [trackedNotification()] })
  expect(await acceptIssueComment(botEvent, 'bot')).toEqual({ status: 'ignored', reason: 'bot_comment' })

  query.mockResolvedValueOnce({ rows: [trackedNotification()] })
  expect(await acceptIssueComment(selfEvent, 'self')).toEqual({ status: 'ignored', reason: 'bot_comment' })

  query.mockResolvedValueOnce({ rows: [trackedNotification()] })
  expect(await acceptIssueComment(senderBotEvent, 'bot-sender')).toEqual({ status: 'ignored', reason: 'bot_comment' })

  query.mockResolvedValueOnce({ rows: [trackedNotification()] })
  expect(await acceptIssueComment(contributorEvent, 'contributor')).toEqual({ status: 'ignored', reason: 'ineligible_author' })

  query.mockResolvedValueOnce({ rows: [trackedNotification()] })
  getResult.mockResolvedValueOnce(undefined)
  expect(await acceptIssueComment(ownerEvent, 'unavailable')).toEqual({ status: 'ignored', reason: 'scan_unavailable' })
})

test('treats only the exact GitHub association values as eligible', async () => {
  const { acceptIssueComment, parseIssueCommentEvent } = await import('@/lib/github/comment-events')
  const event = parseIssueCommentEvent(payload({
    comment: { id: 103, body: 'appeal', author_association: ' OWNER ', user: { login: 'maintainer', type: 'User' } },
  }))
  if (!event) throw new Error('fixture did not parse')
  query.mockResolvedValueOnce({ rows: [trackedNotification()] })
  recordCommentEvent.mockResolvedValue({ inserted: true })

  expect(await acceptIssueComment(event, 'whitespace-association')).toEqual({ status: 'ignored', reason: 'ineligible_author' })
})

test('ignores webhook deliveries without the required GitHub event and delivery headers', async () => {
  const { handleGitHubCommentWebhook } = await import('@/lib/github/comment-events')

  expect(await handleGitHubCommentWebhook(payload(), new Headers())).toEqual({ status: 'ignored', reason: 'missing_headers' })
  expect(await handleGitHubCommentWebhook(payload(), new Headers({ 'x-github-event': 'pull_request', 'x-github-delivery': 'delivery-1' }))).toEqual({ status: 'ignored', reason: 'unsupported_event' })
})
