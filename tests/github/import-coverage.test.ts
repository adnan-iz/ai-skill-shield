import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/security/rate-limit', () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/security/rate-limit-headers', () => ({ addRateLimitHeaders: (response: Response) => response }))
vi.mock('@/lib/validator/service', () => ({ validateAndSave: vi.fn(async () => ({ id: 'scan', batch: { totalSkills: 2 } })) }))
vi.mock('@/lib/github/fetch', () => ({ fetchWithTimeout: vi.fn(), githubAuthError: () => null }))
const { fetchWithTimeout } = await import('@/lib/github/fetch')
const { validateAndSave } = await import('@/lib/validator/service')
const { POST } = await import('@/app/api/github/route')

beforeEach(() => vi.clearAllMocks())

it('records missing helpers in coverage instead of silently returning a clean scope', async () => {
  vi.mocked(fetchWithTimeout).mockImplementation(async path => {
    if (path.includes('/git/trees/')) return Response.json({ tree: [{ path: 'SKILL.md', type: 'blob' }, { path: 'helper.py', type: 'blob' }] })
    if (path.endsWith('/helper.py')) return new Response(null, { status: 404 })
    if (path.endsWith('/SKILL.md')) return new Response('# Helper')
    return Response.json({ default_branch: 'main', sha: 'a'.repeat(40) })
  })
  const response = await POST(new NextRequest('http://localhost/api/github', { method: 'POST', body: JSON.stringify({ owner: 'acme', repo: 'skills', branch: 'main' }) }))
  const body = await response.json()
  expect(body.coverage).toEqual({ status: 'partial', discoveredFiles: 2, inspectedFiles: 1, skippedFiles: [{ path: 'helper.py', reason: 'fetch-http-404' }] })
})

it('sends both manifests and helper contents through batch validation', async () => {
  vi.mocked(fetchWithTimeout).mockImplementation(async path => {
    if (path.includes('/git/trees/')) return Response.json({ tree: [
      { path: 'a/SKILL.md', type: 'blob' }, { path: 'a/helper.py', type: 'blob' }, { path: 'b/SKILL.md', type: 'blob' },
    ] })
    if (path.endsWith('.md')) return new Response('# Helper')
    if (path.endsWith('.py')) return new Response('print("helper")')
    return Response.json({ default_branch: 'main', sha: 'a'.repeat(40) })
  })
  const response = await POST(new NextRequest('http://localhost/api/github', { method: 'POST', body: JSON.stringify({ owner: 'acme', repo: 'skills', branch: 'main' }) }))
  expect(response.status).toBe(200)
  expect(vi.mocked(validateAndSave).mock.calls[0][0].files.map(file => file.path)).toContain('a/helper.py')
  expect(vi.mocked(validateAndSave).mock.calls[0][0].coverage?.status).toBe('complete')
})
