import { afterEach, expect, test, vi } from 'vitest'
import { fetchWithTimeout, githubAuthError } from '@/app/api/github/route'

afterEach(() => {
  vi.restoreAllMocks()
})

test('retries when a GitHub response body terminates', async () => {
  const terminatedBody = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.error(new Error('terminated'))
    },
  })
  const fetchMock = vi.spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(new Response(terminatedBody))
    .mockResolvedValueOnce(Response.json({ ok: true }))

  const response = await fetchWithTimeout('https://api.github.com/repos/example/skill')

  expect(await response.json()).toEqual({ ok: true })
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

test('distinguishes GitHub permission failures from exhausted quota', () => {
  expect(githubAuthError(new Response(null, { status: 403 }))).toContain('denied access')
  expect(githubAuthError(new Response(null, {
    status: 403,
    headers: { 'x-ratelimit-remaining': '0' },
  }))).toContain('API limit reached')
})

test('rejects requests to hosts outside the GitHub allowlist', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')

  await expect(fetchWithTimeout('https://example.com/internal')).rejects.toThrow('Unsupported GitHub request URL')

  expect(fetchMock).not.toHaveBeenCalled()
})
