import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true, limit: 30, remaining: 29, resetAt: Date.now() + 60_000 })),
}))
vi.mock('@/lib/security/rate-limit-headers', () => ({ addRateLimitHeaders: vi.fn((response: Response) => response) }))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const { GET } = await import('@/app/api/github/search/route')

describe('GET /api/github/search', () => {
  beforeEach(() => fetchMock.mockReset())

  it('rejects short search terms before calling GitHub', async () => {
    const response = await GET(new NextRequest('http://localhost:3002/api/github/search?q=a'))
    expect(response.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns a compact, safe repository result shape', async () => {
    fetchMock.mockResolvedValue(Response.json({ items: [{ full_name: 'acme/skills', owner: { login: 'acme' }, name: 'skills', html_url: 'https://github.com/acme/skills', description: 'Agent skills', stargazers_count: 42, updated_at: '2026-08-08T00:00:00Z', default_branch: 'main' }] }))
    const response = await GET(new NextRequest('http://localhost:3002/api/github/search?q=agent%20skills'))
    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ results: [{ owner: 'acme', repo: 'skills', fullName: 'acme/skills', url: 'https://github.com/acme/skills', description: 'Agent skills', stars: 42, updatedAt: '2026-08-08T00:00:00Z', defaultBranch: 'main' }] })
    expect(String(fetchMock.mock.calls[0][0])).toContain('agent+skills')
  })
})
