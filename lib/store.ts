import { db, ensureDatabase } from '@/lib/db'
import { validationResults } from '@/lib/db/schema'
import { eq, count, lt, isNull, or, and, inArray } from 'drizzle-orm'
import type { ValidationResult } from '@/lib/validator/types'

export async function saveResult(result: ValidationResult): Promise<void> {
  await ensureDatabase()

  await db.insert(validationResults).values({
    id: result.id,
    result: JSON.stringify(result),
    createdAt: Date.now(),
    expiresAt: Date.now() + getRetentionDays() * 24 * 60 * 60 * 1000,
  })
}

export async function getResult(id: string): Promise<ValidationResult | undefined> {
  await ensureDatabase()

  const row = await db.select().from(validationResults).where(eq(validationResults.id, id)).limit(1)
  const found = row[0]
  if (!found) return undefined
  return JSON.parse(found.result) as ValidationResult
}

export async function getResultCount(): Promise<number> {
  await ensureDatabase()

  const rows = await db.select({ count: count() }).from(validationResults)
  return rows[0].count
}

export function getRetentionDays(): number {
  return 30
}

export async function cleanExpiredResults(): Promise<number> {
  await ensureDatabase()

  const now = Date.now()
  const cutoff = now - getRetentionDays() * 24 * 60 * 60 * 1000

  const expired = await db.select({ id: validationResults.id })
    .from(validationResults)
    .where(
      or(
        and(isNull(validationResults.expiresAt), lt(validationResults.createdAt, cutoff)),
        lt(validationResults.expiresAt, now)
      )
    )

  if (expired.length === 0) return 0

  await db.delete(validationResults).where(
    inArray(validationResults.id, expired.map((e) => e.id))
  )

  return expired.length
}
