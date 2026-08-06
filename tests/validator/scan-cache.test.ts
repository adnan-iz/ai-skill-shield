import { describe, expect, it } from 'vitest'
import { scanCacheKey } from '@/lib/scan-cache'

describe('scan cache key', () => {
  it('matches equivalent file sets and changes with content', () => {
    const a = { path: 'SKILL.md', content: 'safe' }
    const b = { path: 'scripts/run.ts', content: 'run()' }

    expect(scanCacheKey({ files: [a, b] })).toBe(scanCacheKey({ files: [b, a] }))
    expect(scanCacheKey({ files: [a] })).not.toBe(
      scanCacheKey({ files: [{ ...a, content: 'changed' }] })
    )
  })
})
