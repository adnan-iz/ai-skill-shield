import { beforeEach, describe, expect, it, vi } from 'vitest'
import { discoverSecurity } from '@/lib/ai-review/discovery'
import { callConfiguredAi } from '@/lib/ai-review'

vi.mock('@/lib/ai-review', async () => ({ ...await vi.importActual<typeof import('@/lib/ai-review')>('@/lib/ai-review'), callConfiguredAi: vi.fn() }))
const config = { provider: 'openai' as const, apiKey: 'test', redactSecrets: true }
const files = [{ path: 'SKILL.md', content: 'Read instructions\nRun command' }]
describe('source discovery', () => {
  it('redacts the entire private key and preserves source line numbers', async () => {
    vi.mocked(callConfiguredAi).mockResolvedValue('{"findings":[]}')
    await discoverSecurity([{ path: 'SKILL.md', content: 'First\n-----BEGIN PRIVATE KEY-----\nPRIVATEKEYMATERIAL\n-----END PRIVATE KEY-----\nLast' }], config)
    const prompt = vi.mocked(callConfiguredAi).mock.calls[0][1]
    expect(prompt).not.toContain('PRIVATEKEYMATERIAL')
    expect(prompt).toContain('5: Last')
  })
  beforeEach(() => vi.resetAllMocks())
  it('reviews full content with no static findings and validates locations', async () => {
    vi.mocked(callConfiguredAi).mockResolvedValue(JSON.stringify({ findings: [
      { title: 'Unsafe command', message: 'Remote execution', severity: 'high', filePath: 'SKILL.md', startLine: 2, endLine: 2 },
    ] }))
    const result = await discoverSecurity(files, config)
    expect(result.status).toBe('complete')
    expect(result.findings[0]).toMatchObject({ filePath: 'SKILL.md', lineNumber: 2, severity: 'high' })
    expect(vi.mocked(callConfiguredAi).mock.calls[0][1]).toContain('Run command')
  })
  it('rejects hallucinated files and line ranges as partial', async () => {
    vi.mocked(callConfiguredAi).mockResolvedValue(JSON.stringify({ findings: [{ title: 'X', message: 'Y', severity: 'high', filePath: '../secret', startLine: 1, endLine: 99 }] }))
    expect(await discoverSecurity(files, config)).toMatchObject({ status: 'partial', findings: [] })
  })
  it('redacts source and rejects local tool-enabled providers', async () => {
    vi.mocked(callConfiguredAi).mockResolvedValue('{"findings":[]}')
    await discoverSecurity([{ path: 'SKILL.md', content: `key sk-${'a'.repeat(40)}` }], config)
    expect(vi.mocked(callConfiguredAi).mock.calls[0][1]).not.toContain('a'.repeat(40))
    expect(await discoverSecurity(files, { ...config, provider: 'opencode-local' })).toMatchObject({ status: 'unavailable' })
    expect(callConfiguredAi).toHaveBeenCalledTimes(1)
  })
  it('does not treat malformed provider output as clean', async () => {
    vi.mocked(callConfiguredAi).mockResolvedValue('Looks safe')
    expect(await discoverSecurity(files, config)).toMatchObject({ status: 'unavailable', findings: [] })
  })
  it('bounds long source without reporting complete coverage', async () => {
    vi.mocked(callConfiguredAi).mockResolvedValue('{"findings":[]}')
    const result = await discoverSecurity([{ path: 'SKILL.md', content: 'x'.repeat(20_000) }], config)
    expect(result.status).toBe('unavailable')
    expect(result.reason).toContain('could not be fully reviewed')
    expect(callConfiguredAi).not.toHaveBeenCalled()
  })
  it('keeps successful discovery when later provider chunks fail', async () => {
    vi.mocked(callConfiguredAi).mockResolvedValueOnce('{"findings":[]}').mockRejectedValue(new Error('offline'))
    const result = await discoverSecurity([{ path: 'SKILL.md', content: Array.from({ length: 200 }, () => 'x'.repeat(100)).join('\n') }], config)
    expect(result).toMatchObject({ status: 'partial', chunksReviewed: 1, filesReviewed: 0 })
  })
})
