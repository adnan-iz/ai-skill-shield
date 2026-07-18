import { NextRequest } from 'next/server'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { rateLimits, webhooks } from '@/lib/db/schema'
import { count } from 'drizzle-orm'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import pkg from '../../../package.json'

export async function GET(request: NextRequest) {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await checkRateLimit(`health:${clientIp}`, { maxRequests: 60, windowMs: 60_000 })

  let dbStatus = 'ok'
  let dbError: string | null = null
  let rateLimitEntries = 0
  let webhookCount = 0
  try {
    await ensureDatabase()
    const { db } = getDatabase()
    const [rlRow] = await db.select({ count: count() }).from(rateLimits)
    rateLimitEntries = rlRow.count
    const [whRow] = await db.select({ count: count() }).from(webhooks)
    webhookCount = whRow.count
  } catch (err) {
    dbStatus = 'error'
    dbError = String(err)
  }

  const data = {
    status: dbStatus === 'ok' ? 'ok' : 'degraded',
    version: (pkg as { version: string }).version || '0.1.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: dbStatus,
    databaseError: dbError,
    rateLimitEntries,
    webhookCount,
  }

  return addRateLimitHeaders(Response.json(data), rl)
}
