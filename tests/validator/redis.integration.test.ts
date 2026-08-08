import { createClient } from 'redis'
import { describe, expect, it, vi } from 'vitest'
import { scanCacheKey } from '@/lib/scan-cache'
import { validateAndSave } from '@/lib/validator/service'
import { getRecentPublicResults } from '@/lib/store'
import { getDatabase } from '@/lib/db'

const redisUrl = process.env.REDIS_INTEGRATION_URL
const testDatabaseUrl = process.env.TEST_DATABASE_URL

describe.skipIf(!redisUrl || !testDatabaseUrl)('Redis integration', () => {
  it('caches Explore and reuses scans unless rescan is requested', async () => {
    process.env.DATABASE_URL = testDatabaseUrl
    process.env.REDIS_URL = redisUrl
    const redis = createClient({ url: redisUrl })

    try {
      await redis.connect()
      await redis.flushDb()

      const input = {
        files: [{
          path: 'SKILL.md',
          content: '---\nname: redis-check\ndescription: Verify caching safely.\n---\n\nSummarize local text.',
        }],
        source: { type: 'paste' as const },
      }

      const first = await validateAndSave(input)
      const duplicate = await validateAndSave(input)
      const rescan = await validateAndSave(input, { rescan: true })

      expect(duplicate.id).toBe(first.id)
      expect(rescan.id).not.toBe(first.id)
      expect(await redis.get(scanCacheKey(input))).toBe(rescan.id)

      await getRecentPublicResults(20_000)
      expect(await redis.exists('skillshield:explore:public-results')).toBe(1)
      expect(await redis.ttl('skillshield:explore:public-results')).toBeGreaterThan(0)
    } finally {
      await redis.disconnect().catch(() => {})
      await getDatabase().client.end()
      delete process.env.DATABASE_URL
      delete process.env.REDIS_URL
      vi.resetModules()
    }
  }, 30_000)
})
