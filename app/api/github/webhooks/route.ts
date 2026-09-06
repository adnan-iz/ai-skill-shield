import { handleGitHubCommentWebhook, verifyGitHubSignature } from '@/lib/github/comment-events'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const raw = await request.text()
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim()
  if (!secret || !verifyGitHubSignature(raw, request.headers.get('x-hub-signature-256'), secret)) {
    return new Response('Unauthorized', { status: 401 })
  }

  const result = await handleGitHubCommentWebhook(raw, request.headers)
  return Response.json(result, { status: result.status === 'queued' ? 202 : 200 })
}
