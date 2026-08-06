import { ensureDatabase, getDatabase } from '@/lib/db'
import { validationResults } from '@/lib/db/schema'
import { eq, count, desc, gt, inArray, isNull, lt, or } from 'drizzle-orm'
import { normalizeGitHubSkillPath, trustTargetForResult } from '@/lib/trust'
import type { ValidationResult } from '@/lib/validator/types'
import { normalizeValidationResult } from '@/lib/validator/normalize-result'
import { gzipSync, gunzipSync } from 'node:zlib'
import {
  getCachedExploreResults,
  invalidateExploreCache,
  setCachedExploreResults,
} from '@/lib/scan-cache'

const GZIP_PREFIX = 'gzip:'
const PUBLIC_RESULT_ROW_LIMIT = 10_000

function serializeResult(result: ValidationResult): string {
  return GZIP_PREFIX + gzipSync(JSON.stringify(result)).toString('base64')
}

function parseResult(value: string): ValidationResult {
  const json = value.startsWith(GZIP_PREFIX)
    ? gunzipSync(Buffer.from(value.slice(GZIP_PREFIX.length), 'base64')).toString('utf8')
    : value
  return normalizeValidationResult(JSON.parse(json) as ValidationResult)
}

export async function saveResult(result: ValidationResult): Promise<void> {
  await ensureDatabase()
  const { db } = getDatabase()
  const normalized = normalizeValidationResult(result)

  await db.insert(validationResults).values({
    id: normalized.id,
    result: serializeResult(normalized),
    createdAt: Date.now(),
    expiresAt:
      trustTargetForResult(normalized)
        ? null
        : Date.now() + getRetentionDays() * 24 * 60 * 60 * 1000,
  })
  await invalidateExploreCache()
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

  // Keep latest-result lookups complete; Explore uses the bounded path below.
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

export async function getRecentPublicResults(limit = 100): Promise<ValidationResult[]> {
  if (limit >= 1_000) {
    const cached = await getCachedExploreResults()
    if (cached) return cached
  }

  await ensureDatabase()
  const { db } = getDatabase()
  const rows = await db
    .select({ result: validationResults.result })
    .from(validationResults)
    .where(or(isNull(validationResults.expiresAt), gt(validationResults.expiresAt, Date.now())))
    .orderBy(desc(validationResults.createdAt))
    // ponytail: cap the first-pass scan so Explore stays responsive; index public source columns if this ceiling is reached.
    .limit(Math.max(limit, PUBLIC_RESULT_ROW_LIMIT))

  const results: ValidationResult[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    try {
      const result = parseResult(row.result)
      const target = trustTargetForResult(result)
      if (!target) continue
      const key = `${target.owner.toLowerCase()}/${target.repo.toLowerCase()}/${target.path.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push(result)
      if (results.length >= limit) break
    } catch {
      // Ignore corrupt legacy rows and keep the public directory available.
    }
  }

  if (limit >= 1_000) await setCachedExploreResults(results)
  return results
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
  await invalidateExploreCache()

  return expired.length
}
