import { ensureDatabase, getDatabase } from '@/lib/db'
import { rateLimits } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export interface RateLimitOptions {
  maxRequests: number
  windowMs: number
}

export async function checkRateLimit(
  key: string,
  options: RateLimitOptions = { maxRequests: 60, windowMs: 60_000 }
): Promise<{ allowed: boolean; limit: number; remaining: number; resetAt: number }> {
  await ensureDatabase()
  const { db } = getDatabase()

  const now = Date.now()

  const rows = await db.select().from(rateLimits).where(eq(rateLimits.key, key)).limit(1)
  const entry = rows[0]

  if (!entry || now >= entry.resetAt) {
    await db.insert(rateLimits).values({
      key,
      count: 1,
      resetAt: now + options.windowMs,
    }).onConflictDoUpdate({
      target: rateLimits.key,
      set: { count: 1, resetAt: now + options.windowMs },
    })
    return { allowed: true, limit: options.maxRequests, remaining: options.maxRequests - 1, resetAt: now + options.windowMs }
  }

  if (entry.count >= options.maxRequests) {
    return { allowed: false, limit: options.maxRequests, remaining: 0, resetAt: entry.resetAt }
  }

  await db.update(rateLimits).set({ count: entry.count + 1 }).where(eq(rateLimits.key, key))
  return { allowed: true, limit: options.maxRequests, remaining: options.maxRequests - entry.count - 1, resetAt: entry.resetAt }
}
