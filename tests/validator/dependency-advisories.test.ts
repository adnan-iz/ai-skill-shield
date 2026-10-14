import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

async function scanner() {
  return (await import('@/lib/validator/dependency-advisories')).scanDependencyAdvisories
}

describe('OSV dependency advisories', () => {
  it('queries exact npm lockfile and Python pins, and reports advisory evidence', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ results: [{ vulns: [{ id: 'GHSA-test' }] }, {}] }))
      .mockResolvedValueOnce(Response.json({ id: 'GHSA-test', summary: 'Unsafe package', database_specific: { severity: 'HIGH' }, affected: [{ package: { name: '@scope/tool', ecosystem: 'npm' }, ranges: [{ events: [{ introduced: '0' }, { fixed: '1.2.4' }] }] }] }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await (await scanner())([
      { path: 'package-lock.json', content: JSON.stringify({ packages: { '': { version: '1.0.0' }, 'node_modules/@scope/tool': { version: '1.2.3' } } }, null, 2) },
      { path: 'requirements.txt', content: 'requests==2.31.0\nflask>=3\nstarlette==0.4.*' },
    ])
    expect(result.status).toBe('complete')
    expect(result.checkedPackages).toBe(2)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).queries).toEqual([
      { package: { name: '@scope/tool', ecosystem: 'npm' }, version: '1.2.3' },
      { package: { name: 'requests', ecosystem: 'PyPI' }, version: '2.31.0' },
    ])
    expect(result.findings[0]).toMatchObject({ severity: 'high', filePath: 'package-lock.json', ruleId: 'dependency-vulnerability' })
    expect(result.findings[0].message).toContain('GHSA-test')
    expect(result.findings[0].recommendation).toContain('1.2.4')
    expect(result.findings[0].lineNumber).toBeGreaterThan(1)
  })

  it('does not query ranges or files with no dependencies', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const result = await (await scanner())([{ path: 'package.json', content: '{"dependencies":{"a":"^1.2.3","b":"latest","c":"1.2"}}' }])
    expect(result).toEqual({ findings: [], status: 'complete', checkedPackages: 0 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('parses legacy lockfiles, exact manifests and pyproject project dependencies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ results: [{}, {}, {}] }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await (await scanner())([
      { path: 'old/package-lock.json', content: '{"dependencies":{"legacy":{"version":"2.3.4"}}}' },
      { path: 'package.json', content: '{"dependencies":{"exact":"3.4.5"}}' },
      { path: 'pyproject.toml', content: '[project]\ndependencies = [\n "Django==4.2.1",\n "flask>=3",\n]\n[tool.other]\nrandom = "wrong==1.0"' },
    ])
    expect(result.checkedPackages).toBe(3)
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).queries.map((q: { package: { name: string } }) => q.package.name)).toEqual(['legacy', 'exact', 'django'])
  })

  it('reports unavailable on failed, malformed or paginated responses', async () => {
    for (const response of [new Response('', { status: 503 }), Response.json({}), Response.json({ results: [{ error: 'failed' }] }), Response.json({ results: [{ next_page_token: 'more' }] })]) {
      vi.resetModules()
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
      const result = await (await scanner())([{ path: 'requirements.txt', content: 'a==1.0' }])
      expect(result.status).toBe('unavailable')
    }
  })

  it('treats malformed advisory details and timeouts as unavailable', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ results: [{ vulns: [{ id: 'GHSA-test' }] }] }))
      .mockResolvedValueOnce(Response.json({ id: 'GHSA-test', affected: [{ ranges: 'invalid' }] }))
    vi.stubGlobal('fetch', fetchMock)
    const scan = await scanner()
    expect((await scan([{ path: 'requirements.txt', content: 'a==1.0' }])).status).toBe('unavailable')
    fetchMock.mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'))
    expect((await scan([{ path: 'requirements.txt', content: 'b==1.0' }])).status).toBe('unavailable')
  })

  it('caches successful package lookups for an hour and preserves each file location', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ results: [{}] })))
    vi.stubGlobal('fetch', fetchMock)
    const scan = await scanner()
    await scan([{ path: 'requirements.txt', content: 'a==1.0' }])
    await scan([{ path: 'nested/requirements.txt', content: 'a==1.0' }])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const now = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3_600_001)
    await scan([{ path: 'requirements.txt', content: 'a==1.0' }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })

  it('marks malformed manifests and bounded input overflow unavailable', async () => {
    const fetchMock = vi.fn().mockImplementation((_url, init) => Promise.resolve(Response.json({ results: JSON.parse(init.body).queries.map(() => ({})) })))
    vi.stubGlobal('fetch', fetchMock)
    const scan = await scanner()
    expect((await scan([{ path: 'package-lock.json', content: '{' }])).status).toBe('unavailable')
    const result = await scan([{ path: 'requirements.txt', content: Array.from({ length: 201 }, (_, i) => `pkg${i}==1.0`).join('\n') }])
    expect(result.status).toBe('unavailable')
    expect(result.checkedPackages).toBeLessThanOrEqual(200)
  })
})
