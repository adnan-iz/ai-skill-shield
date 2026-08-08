import { NextRequest } from 'next/server'
import { and, eq, inArray } from 'drizzle-orm'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { badRequest, serverError, tooManyRequests } from '@/lib/api-error'
import { logAuditEvent } from '@/lib/webhooks'
import { validateId } from '@/lib/security/input-validation'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'

const EVENTS = new Set([
  'trust.view',
  'trust.share',
  'trust.badge_copy',
  'trust.cta',
  'trust.converted',
  'trust.feedback.safe',
  'trust.feedback.unsafe',
  'report.view',
  'report.share',
  'report.badge_copy',
])

export async function GET(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimit(`events-read:${clientIp}`, { maxRequests: 120, windowMs: 60_000 })
  if (!rl.allowed) return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)

  const scanId = request.nextUrl.searchParams.get('scanId') || ''
  if (validateId(scanId)) return addRateLimitHeaders(badRequest('Invalid scan id'), rl)

  try {
    await ensureDatabase()
    const { db } = getDatabase()
    const rows = await db.select({ event: auditLogs.event })
      .from(auditLogs)
      .where(and(
        eq(auditLogs.scanId, scanId),
        inArray(auditLogs.event, ['trust.feedback.safe', 'trust.feedback.unsafe']),
      ))
    const safe = rows.filter((row) => row.event === 'trust.feedback.safe').length
    const unsafe = rows.length - safe
    return addRateLimitHeaders(Response.json({ safe, unsafe, total: rows.length }), rl)
  } catch {
    return addRateLimitHeaders(serverError(), rl)
  }
}

export async function POST(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimit(`events:${clientIp}`, { maxRequests: 60, windowMs: 60_000 })
  if (!rl.allowed) return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)

  try {
    const raw = await request.text()
    if (raw.length > 2048) return addRateLimitHeaders(badRequest('Payload too large'), rl)

    const body = JSON.parse(raw) as { event?: unknown; scanId?: unknown }
    if (typeof body.event !== 'string' || !EVENTS.has(body.event)) {
      return addRateLimitHeaders(badRequest('Invalid event'), rl)
    }
    if (typeof body.scanId !== 'string' || validateId(body.scanId)) {
      return addRateLimitHeaders(badRequest('Invalid scan id'), rl)
    }

    await logAuditEvent(body.event, body.scanId)
    return addRateLimitHeaders(new Response(null, { status: 204 }), rl)
  } catch {
    return addRateLimitHeaders(serverError(), rl)
  }
}
