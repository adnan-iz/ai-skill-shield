import { handleGitHubCommentWebhook, verifyGitHubSignature } from '@/lib/github/comment-events'

export const dynamic = 'force-dynamic'
const MAX_WEBHOOK_BODY_BYTES = 32 * 1024

export async function POST(request: Request) {
  const raw = await readBoundedRequestBody(request)
  if (raw === null) return new Response('Payload Too Large', { status: 413 })
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim()
  if (!secret || !verifyGitHubSignature(raw, request.headers.get('x-hub-signature-256'), secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await handleGitHubCommentWebhook(raw, request.headers)
  return Response.json(result, { status: result.status === 'queued' ? 202 : 200 })
}

async function readBoundedRequestBody(request: Request): Promise<string | null> {
  const declaredLength = request.headers.get('content-length')
  if (declaredLength && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_WEBHOOK_BODY_BYTES) return null

  const reader = request.body?.getReader()
  if (!reader) return ''

  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_WEBHOOK_BODY_BYTES) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(bytes)
}
