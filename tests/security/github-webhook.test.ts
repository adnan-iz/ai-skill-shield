import { createHmac } from 'node:crypto'
import { afterEach, expect, test, vi } from 'vitest'

const secret = 'test-webhook-secret'
const raw = JSON.stringify({ action: 'created' })

afterEach(() => {
  vi.resetModules()
  vi.doUnmock('@/lib/github/comment-events')
  delete process.env.GITHUB_WEBHOOK_SECRET
})

test('accepts only the exact SHA-256 HMAC for the raw webhook body', async () => {
  const { verifyGitHubSignature } = await import('@/lib/github/comment-events')
  const signature = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`

  expect(verifyGitHubSignature(raw, signature, secret)).toBe(true)
  expect(verifyGitHubSignature(raw, 'sha256=00', secret)).toBe(false)
  expect(verifyGitHubSignature(raw, null, secret)).toBe(false)
})

test('rejects an unsigned webhook before handing its body to the parser', async () => {
  const handleGitHubCommentWebhook = vi.fn()
  vi.doMock('@/lib/github/comment-events', () => ({
    verifyGitHubSignature: () => false,
    handleGitHubCommentWebhook,
  }))
  process.env.GITHUB_WEBHOOK_SECRET = secret

  const { POST } = await import('@/app/api/github/webhooks/route')
  const response = await POST(new Request('http://localhost/api/github/webhooks', {
    method: 'POST',
    body: '{not-json',
  }))

  expect(response.status).toBe(401)
  expect(await response.text()).toBe('Unauthorized')
  expect(handleGitHubCommentWebhook).not.toHaveBeenCalled()
})

test('returns accepted only after a valid signed delivery is queued', async () => {
  const handleGitHubCommentWebhook = vi.fn().mockResolvedValue({ status: 'queued' })
  vi.doMock('@/lib/github/comment-events', async () => {
    const crypto = await import('node:crypto')
    return {
      verifyGitHubSignature: (body: string, signature: string | null, configuredSecret: string) => {
        const expected = `sha256=${crypto.createHmac('sha256', configuredSecret).update(body).digest('hex')}`
        return signature === expected
      },
      handleGitHubCommentWebhook,
    }
  })
  process.env.GITHUB_WEBHOOK_SECRET = secret
  const signature = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`

  const { POST } = await import('@/app/api/github/webhooks/route')
  const response = await POST(new Request('http://localhost/api/github/webhooks', {
    method: 'POST',
    headers: { 'x-hub-signature-256': signature },
    body: raw,
  }))

  expect(response.status).toBe(202)
  expect(await response.json()).toEqual({ status: 'queued' })
  expect(handleGitHubCommentWebhook).toHaveBeenCalledWith(raw, expect.any(Headers))
})

test('rejects an oversized delivery without trusting absent or misleading Content-Length', async () => {
  const oversized = 'x'.repeat(32 * 1024 + 1)
  const signature = `sha256=${createHmac('sha256', secret).update(oversized).digest('hex')}`
  const { POST } = await import('@/app/api/github/webhooks/route')
  process.env.GITHUB_WEBHOOK_SECRET = secret

  for (const contentLength of [undefined, '1']) {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(oversized))
        controller.close()
      },
    })
    const response = await POST(new Request('http://localhost/api/github/webhooks', {
      method: 'POST',
      headers: {
        'x-hub-signature-256': signature,
        ...(contentLength ? { 'content-length': contentLength } : {}),
      },
      body: stream,
      duplex: 'half',
    } as RequestInit))

    expect(response.status).toBe(413)
  }
})
