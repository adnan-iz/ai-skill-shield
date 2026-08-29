import { NextRequest } from 'next/server'
import { getResult } from '@/lib/store'
import { notifyGitHubRepositoryOwner } from '@/lib/github/notifications'
import { validateId } from '@/lib/security/input-validation'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { badRequest, notFound, serverError, tooManyRequests } from '@/lib/api-error'
import { logAuditEvent } from '@/lib/webhooks'

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function safeNotificationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  const status = message.match(/\((401|403|404|410|422)\)/)?.[1]
  if (status === '401') return 'GitHub rejected the bot token. Replace GITHUB_BOT_TOKEN and redeploy.'
  if (status === '403') return 'GitHub denied issue creation. Check the bot token scope and repository issue permissions.'
  if (status === '404' || status === '410') return 'The target repository or its Issues board is unavailable.'
  if (status === '422') return 'GitHub rejected the issue content or repository interaction policy.'
  return 'Could not notify the repository owner. Check the deployment logs for the GitHub API error.'
}

/** Sends a public report only after a user explicitly asks to notify the repository. */
export async function POST(request: NextRequest) {
  // A user may need to correct credentials or a repository setting and retry.
  // Keep the manual cross-repository action bounded without locking them out after one diagnosis cycle.
  const rl = await checkRateLimit(`github-owner-notify:${clientIp(request)}`, { maxRequests: 10, windowMs: 60 * 60 * 1000 })
  if (!rl.allowed) return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)

  try {
    const raw = await request.text()
    if (raw.length > 256) return addRateLimitHeaders(badRequest('Payload too large'), rl)
    const body = JSON.parse(raw) as { scanId?: unknown }
    if (typeof body.scanId !== 'string' || validateId(body.scanId)) {
      return addRateLimitHeaders(badRequest('Invalid scan id'), rl)
    }

    const result = await getResult(body.scanId)
    if (!result) return addRateLimitHeaders(notFound('Scan result not found'), rl)

    const outcome = await notifyGitHubRepositoryOwner(result, { allowBotFallback: true })
    if (outcome === 'disabled') {
      return addRateLimitHeaders(serverError('GitHub notifications are not configured'), rl)
    }
    if (outcome === 'ineligible') {
      return addRateLimitHeaders(badRequest('Only public default-branch GitHub scans can notify a repository'), rl)
    }

    await logAuditEvent(
      outcome === 'notified' ? 'github.owner_notified' : 'github.owner_notification_requested',
      result.id,
      { sourceUrl: result.source?.url, outcome }
    )
    return addRateLimitHeaders(Response.json({ outcome }), rl)
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'GitHub owner notification failed',
      requestId: request.headers.get('x-vercel-id'),
      error: error instanceof Error ? error.message : String(error),
    }))
    return addRateLimitHeaders(serverError(safeNotificationError(error)), rl)
  }
}
