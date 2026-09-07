import { timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { decideReview, ReviewServiceError } from '@/lib/review/service'
import { refreshReviewReply } from '@/lib/github/review-replies'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 16 * 1024
const DecisionBodySchema = z.object({
  action: z.enum(['approve', 'reject']),
  findingReviewIds: z.array(z.string().uuid()).min(1).max(20).refine((ids) => new Set(ids).size === ids.length, 'Finding review IDs must be unique'),
  reviewer: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(1_000).optional(),
}).strict()

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const configuredToken = process.env.SCAN_REVIEW_ADMIN_TOKEN?.trim()
  if (!configuredToken) return Response.json({ error: 'Scan review approval is not configured' }, { status: 503 })
  if (!hasValidBearer(request.headers.get('authorization'), configuredToken)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const reviewId = z.string().uuid().parse(id)
    const raw = await readBoundedBody(request, MAX_BODY_BYTES)
    const body = DecisionBodySchema.parse(JSON.parse(raw))
    const result = await decideReview({ reviewId, ...body })
    try {
      await refreshReviewReply(reviewId)
    } catch (error) {
      console.error(JSON.stringify({
        level: 'error',
        message: 'Scan review decision was saved but its GitHub reply could not be refreshed',
        reviewId,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
    return Response.json(result)
  } catch (error) {
    if (error instanceof ReviewServiceError) {
      const status = error.code === 'not_found' ? 404 : error.code === 'conflict' ? 409 : 400
      return Response.json({ error: error.message }, { status })
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof BodyTooLargeError) {
      return Response.json({ error: error instanceof BodyTooLargeError ? error.message : 'Invalid decision request' }, { status: error instanceof BodyTooLargeError ? 413 : 400 })
    }
    return Response.json({ error: 'Unable to record scan review decision' }, { status: 500 })
  }
}

function hasValidBearer(header: string | null, token: string): boolean {
  const expected = Buffer.from(`Bearer ${token}`)
  const received = Buffer.from(header ?? '')
  return received.length === expected.length && timingSafeEqual(received, expected)
}

class BodyTooLargeError extends Error {}

async function readBoundedBody(request: Request, limit: number): Promise<string> {
  const declaredLength = Number(request.headers.get('content-length'))
  if (Number.isFinite(declaredLength) && declaredLength > limit) throw new BodyTooLargeError('Decision request is too large')
  if (!request.body) return ''

  const reader = request.body.getReader()
  const decoder = new TextDecoder()
  let total = 0
  let body = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > limit) {
      await reader.cancel()
      throw new BodyTooLargeError('Decision request is too large')
    }
    body += decoder.decode(value, { stream: true })
  }
  return body + decoder.decode()
}
