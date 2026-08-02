import { ensureDatabase, getDatabase } from '@/lib/db'
import { validationResults } from '@/lib/db/schema'
import { eq, count, desc, gt, inArray, isNull, lt, or } from 'drizzle-orm'
import { normalizeGitHubSkillPath, trustTargetForResult } from '@/lib/trust'
import type { ValidationResult } from '@/lib/validator/types'
import { gzipSync, gunzipSync } from 'node:zlib'

const GZIP_PREFIX = 'gzip:'

function serializeResult(result: ValidationResult): string {
  return GZIP_PREFIX + gzipSync(JSON.stringify(result)).toString('base64')
}

function parseResult(value: string): ValidationResult {
  const json = value.startsWith(GZIP_PREFIX)
    ? gunzipSync(Buffer.from(value.slice(GZIP_PREFIX.length), 'base64')).toString('utf8')
    : value
  return JSON.parse(json) as ValidationResult
}

export async function saveResult(result: ValidationResult): Promise<void> {
  await ensureDatabase()
  const { db } = getDatabase()

  await db.insert(validationResults).values({
    id: result.id,
    result: serializeResult(result),
    createdAt: Date.now(),
    expiresAt:
      trustTargetForResult(result)
        ? null
        : Date.now() + getRetentionDays() * 24 * 60 * 60 * 1000,
  })
}

export async function getResult(id: string): Promise<ValidationResult | undefined> {
  await ensureDatabase()
  const { db } = getDatabase()

  const row = await db.select().from(validationResults).where(eq(validationResults.id, id)).limit(1)
  const found = row[0]
  if (!found) return undefined
  return parseResult(found.result)
}

export async function getResultCount(): Promise<number> {
  await ensureDatabase()
  const { db } = getDatabase()

  const rows = await db.select({ count: count() }).from(validationResults)
  return rows[0].count
}

export async function getLatestGitHubResult(
  owner: string,
  repo: string,
  path = ''
): Promise<ValidationResult | undefined> {
  await ensureDatabase()
  const { db } = getDatabase()

  // ponytail: JSON blob scan is fine for the local-first MVP; index source columns when report volume makes this measurable.
  const rows = await db
    .select({ result: validationResults.result })
    .from(validationResults)
    .where(or(isNull(validationResults.expiresAt), gt(validationResults.expiresAt, Date.now())))
    .orderBy(desc(validationResults.createdAt))

  const normalizedOwner = owner.toLowerCase()
  const normalizedRepo = repo.toLowerCase()
  const normalizedPath = normalizeGitHubSkillPath(path)

  for (const row of rows) {
    try {
      const result = parseResult(row.result)
      const source = result.source
      if (
        source?.type === 'github' &&
        source.owner?.toLowerCase() === normalizedOwner &&
        source.repo?.toLowerCase() === normalizedRepo &&
        normalizeGitHubSkillPath(source.path) === normalizedPath &&
        trustTargetForResult(result)
      ) {
        return result
      }
    } catch {
      // Ignore a corrupt legacy row and keep looking for the latest valid scan.
    }
  }

  return undefined
}

export function getRetentionDays(): number {
  return 30
}

export async function cleanExpiredResults(): Promise<number> {
  await ensureDatabase()
  const { db } = getDatabase()

  const now = Date.now()

  const expired = await db.select({ id: validationResults.id })
    .from(validationResults)
    .where(lt(validationResults.expiresAt, now))

  if (expired.length === 0) return 0

  await db.delete(validationResults).where(
    inArray(validationResults.id, expired.map((e) => e.id))
  )

  return expired.length
}
