import { and, eq } from 'drizzle-orm'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { githubScanNotifications } from '@/lib/db/schema'
import { githubTokenRequest } from './app-client'
import { acceptIssueComment, type IssueCommentEvent } from './comment-events'

const MAX_TARGETS = 25
const MAX_COMMENTS = 100

interface GitHubComment {
  id?: unknown
  body?: unknown
  user?: { login?: unknown; type?: unknown }
  author_association?: unknown
}

export interface PollResult { targets: number; comments: number; queued: number; duplicates: number; ignored: number }

/** Polls tracked scan issues using GITHUB_TOKEN; comment IDs make retries idempotent. */
export async function pollGitHubScanComments(): Promise<PollResult> {
  await ensureDatabase()
  const { db } = getDatabase()
  const targets = await db.select().from(githubScanNotifications).limit(MAX_TARGETS)
  const result: PollResult = { targets: targets.length, comments: 0, queued: 0, duplicates: 0, ignored: 0 }

  for (const target of targets) {
    const path = `/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/issues/${target.issueNumber}/comments?per_page=${MAX_COMMENTS}`
    const response = await githubTokenRequest(path)
    if (!response.ok) throw new Error(`GitHub comment polling failed (${response.status})`)
    const comments = await response.json() as unknown
    if (!Array.isArray(comments)) continue
    for (const item of comments.slice(0, MAX_COMMENTS)) {
      const comment = item as GitHubComment
      if (!Number.isSafeInteger(comment.id) || typeof comment.body !== 'string' || !comment.user || typeof comment.user.login !== 'string') continue
      result.comments++
      const event: IssueCommentEvent = {
        action: 'created', owner: target.owner, repo: target.repo, issueNumber: target.issueNumber,
        commentId: comment.id as number, commenterLogin: comment.user.login, commenterType: typeof comment.user.type === 'string' ? comment.user.type : undefined,
        senderLogin: comment.user.login, senderType: typeof comment.user.type === 'string' ? comment.user.type : undefined,
        authorAssociation: typeof comment.author_association === 'string' ? comment.author_association : 'NONE', commentBody: comment.body,
      }
      const outcome = await acceptIssueComment(event, `poll:${target.owner}/${target.repo}/${target.issueNumber}/${comment.id}`)
      if (outcome.status === 'queued') result.queued++
      else if (outcome.status === 'duplicate') result.duplicates++
      else result.ignored++
    }
  }
  return result
}
