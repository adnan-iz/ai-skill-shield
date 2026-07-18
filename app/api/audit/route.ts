import { NextRequest } from 'next/server'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { auditLogs } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { serverError } from '@/lib/api-error'

export async function GET(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimit(`audit:${clientIp}`)
  if (!rl.allowed) {
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Content-Type': 'application/json' } }),
      rl
    )
  }

  try {
    await ensureDatabase()
    const { db } = getDatabase()

    const event = request.nextUrl.searchParams.get('event')
    const limitParam = request.nextUrl.searchParams.get('limit')
    const limit = Math.min(Math.max(parseInt(limitParam || '50', 10) || 50, 1), 200)

    const conditions: ReturnType<typeof eq>[] = []
    if (event) {
      conditions.push(eq(auditLogs.event, event))
    }

    const logs = await db.select()
      .from(auditLogs)
      .where(and(...conditions))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)

    const parsed = logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }))

    return addRateLimitHeaders(Response.json(parsed), rl)
  } catch {
    return serverError()
  }
}
