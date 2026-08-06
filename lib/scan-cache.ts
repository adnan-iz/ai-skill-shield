import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { createClient } from 'redis'
import type { SkillInput, ValidationResult } from '@/lib/validator/types'

const EXPLORE_CACHE_KEY = 'skillshield:explore:public-results'

function connectClient(url: string) {
  const client = createClient({ url })
  client.on('error', () => {})
  return client.connect().then(() => client).catch(() => undefined)
}

let clientPromise: ReturnType<typeof connectClient> | undefined

async function getClient() {
  const url = process.env.REDIS_URL?.trim()
  if (!url) return undefined

  clientPromise ??= connectClient(url)

  return clientPromise
}

export function scanCacheKey(input: SkillInput): string {
  const files = [...input.files].sort((a, b) => a.path.localeCompare(b.path))
  const fingerprint = JSON.stringify({ ...input, files, cacheVersion: 1 })
  return `skillshield:scan:${createHash('sha256').update(fingerprint).digest('hex')}`
}

export async function getCachedResultId(key: string): Promise<string | undefined> {
  try {
    return (await (await getClient())?.get(key)) || undefined
  } catch {
    return undefined
  }
}

export async function setCachedResultId(key: string, id: string): Promise<void> {
  try {
    await (await getClient())?.set(key, id, {
      EX: Number(process.env.SCAN_CACHE_TTL_SECONDS) || 30 * 24 * 60 * 60,
    })
  } catch {
    // Redis is an optimization; a cache outage must not block scans.
  }
}

export async function getCachedExploreResults(): Promise<ValidationResult[] | undefined> {
  try {
    const value = await (await getClient())?.get(EXPLORE_CACHE_KEY)
    return value
      ? JSON.parse(gunzipSync(Buffer.from(value, 'base64')).toString('utf8')) as ValidationResult[]
      : undefined
  } catch {
    return undefined
  }
}

export async function setCachedExploreResults(results: ValidationResult[]): Promise<void> {
  try {
    await (await getClient())?.set(
      EXPLORE_CACHE_KEY,
      gzipSync(JSON.stringify(results)).toString('base64'),
      { EX: Number(process.env.EXPLORE_CACHE_TTL_SECONDS) || 300 }
    )
  } catch {
    // Redis is an optimization; Explore can fall back to the database.
  }
}

export async function invalidateExploreCache(): Promise<void> {
  try {
    await (await getClient())?.del(EXPLORE_CACHE_KEY)
  } catch {
    // A short TTL bounds stale Explore results when Redis is unavailable.
  }
}
