import { afterEach, expect, test, vi } from 'vitest'
import { fetchWithTimeout } from '@/app/api/github/route'

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
