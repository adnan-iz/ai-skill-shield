import { createHash } from 'node:crypto'
import { gzipSync, gunzipSync } from 'node:zlib'
import { createClient } from 'redis'
import type { SkillInput, ValidationResult } from '@/lib/validator/types'
import type { ExplorerMetaItem } from '@/lib/explorer'

const EXPLORE_CACHE_KEY = 'skillshield:explore:public-results'
const EXPLORE_ITEMS_CACHE_KEY = 'skillshield:explore:public-items'
const IN_MEMORY_TTL_MS = 5 * 60 * 1000

interface MemoryCacheEntry<T> {
  data: T
  expiry: number
}

const memoryCache = new Map<string, MemoryCacheEntry<unknown>>()
let exploreGeneration = 0

function getMemoryCache<T>(key: string): T | undefined {
  const entry = memoryCache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key)
    return undefined
  }
  return entry.data as T
}

function setMemoryCache<T>(key: string, data: T, ttlMs = IN_MEMORY_TTL_MS): void {
  memoryCache.set(key, { data, expiry: Date.now() + ttlMs })
}

export function getExploreGeneration(): number {
  return exploreGeneration
}

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
  const fingerprint = JSON.stringify({ ...input, files, cacheVersion: 2 })
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
  const memKey = EXPLORE_CACHE_KEY
  const memCached = getMemoryCache<ValidationResult[]>(memKey)
  if (memCached) return memCached

  try {
    const value = await (await getClient())?.get(EXPLORE_CACHE_KEY)
    if (value) {
      const results = JSON.parse(gunzipSync(Buffer.from(value, 'base64')).toString('utf8')) as ValidationResult[]
      setMemoryCache(memKey, results)
      return results
    }
  } catch {
    // Fall through to return undefined
  }
  return undefined
}

export async function setCachedExploreResults(results: ValidationResult[]): Promise<void> {
  setMemoryCache(EXPLORE_CACHE_KEY, results)
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

export async function getCachedExploreItems(): Promise<ExplorerMetaItem[] | undefined> {
  const memCached = getMemoryCache<ExplorerMetaItem[]>(EXPLORE_ITEMS_CACHE_KEY)
  if (memCached) return memCached

  try {
    const value = await (await getClient())?.get(EXPLORE_ITEMS_CACHE_KEY)
    if (value) {
      const items = JSON.parse(gunzipSync(Buffer.from(value, 'base64')).toString('utf8')) as ExplorerMetaItem[]
      setMemoryCache(EXPLORE_ITEMS_CACHE_KEY, items)
      return items
    }
  } catch {
    // Fall through
  }
  return undefined
}

export async function setCachedExploreItems(items: ExplorerMetaItem[]): Promise<void> {
  setMemoryCache(EXPLORE_ITEMS_CACHE_KEY, items)
  try {
    await (await getClient())?.set(
      EXPLORE_ITEMS_CACHE_KEY,
      gzipSync(JSON.stringify(items)).toString('base64'),
      { EX: Number(process.env.EXPLORE_CACHE_TTL_SECONDS) || 300 }
    )
  } catch {
    // Redis is an optimization
  }
}

export async function invalidateExploreCache(): Promise<void> {
  exploreGeneration++
  memoryCache.delete(EXPLORE_CACHE_KEY)
  memoryCache.delete(EXPLORE_ITEMS_CACHE_KEY)
  try {
    const client = await getClient()
    if (client) {
      await client.del(EXPLORE_CACHE_KEY)
      await client.del(EXPLORE_ITEMS_CACHE_KEY)
    }
  } catch {
    // A short TTL bounds stale Explore results when Redis is unavailable.
  }
}
