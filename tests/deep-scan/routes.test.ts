import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as deepScan } from '@/app/api/deep-scan/route'
import { POST as discovery } from '@/app/api/ai-discovery/route'
import { runDeepScan } from '@/lib/deep-scan'
import { discoverSecurity } from '@/lib/ai-review/discovery'
import { getResult } from '@/lib/store'
import { checkRateLimit } from '@/lib/security/rate-limit'

vi.mock('@/lib/store', () => ({ getResult: vi.fn() }))
vi.mock('@/lib/deep-scan', () => ({ runDeepScan: vi.fn() }))
vi.mock('@/lib/ai-review/discovery', () => ({ discoverSecurity: vi.fn() }))
vi.mock('@/lib/security/rate-limit', () => ({ checkRateLimit: vi.fn() }))
vi.mock('@/lib/security/rate-limit-headers', () => ({ addRateLimitHeaders: (response: Response) => response }))
const request = (body: unknown) => new Request('http://localhost/api/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
describe('optional scanner routes', () => {
  afterEach(() => vi.unstubAllEnvs())
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: true } as Awaited<ReturnType<typeof checkRateLimit>>)
    vi.mocked(getResult).mockResolvedValue({ id: 'saved', findings: [{ id: 'static' }], source: { type: 'paste' }, skillPreview: { files: [{ path: 'SKILL.md', content: 'saved source' }] } } as Awaited<ReturnType<typeof getResult>>)
    vi.mocked(runDeepScan).mockResolvedValue({ status: 'partial', findings: [], engine: 'skillspector', engineRevision: 'test', scoreDirection: 'higher-is-worse', issues: [] })
    vi.stubEnv('OPENAI_API_KEY', 'test')
    vi.mocked(discoverSecurity).mockResolvedValue({ status: 'complete', findings: [], filesReviewed: 1, totalFiles: 1, chunksReviewed: 1, totalChunks: 1 })
  })
  it('accepts only saved scan identifiers and retains deterministic evidence', async () => {
    expect((await deepScan(request({ scanId: 'saved', path: '/server/secrets' }))).status).toBe(400)
    const response = await deepScan(request({ scanId: 'saved' }))
    expect(await response.json()).toMatchObject({ scanId: 'saved', status: 'partial', deterministicFindings: [{ id: 'static' }] })
    expect(runDeepScan).toHaveBeenCalledWith([{ path: 'SKILL.md', content: 'saved source' }], expect.any(Object))
  })
  it('requires explicit source transmission consent and can review zero static findings', async () => {
    expect((await discovery(request({ scanId: 'saved' }))).status).toBe(400)
    expect((await discovery(request({ scanId: 'saved', consent: true }))).status).toBe(200)
    expect(discoverSecurity).toHaveBeenCalledWith([{ path: 'SKILL.md', content: 'saved source' }], expect.objectContaining({ provider: 'openai', redactSecrets: true }))
  })
  it('rate limits both scanners before reading stored data', async () => {
    vi.mocked(checkRateLimit).mockResolvedValue({ allowed: false } as Awaited<ReturnType<typeof checkRateLimit>>)
    expect((await deepScan(request({ scanId: 'saved' }))).status).toBe(429)
    expect((await discovery(request({ scanId: 'saved', consent: true }))).status).toBe(429)
    expect(getResult).not.toHaveBeenCalled()
  })
})
