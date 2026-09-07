import { z } from 'zod'
import { getPublicReviewApiModel } from '@/lib/trust-server'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const id = z.string().uuid().safeParse((await params).id)
  if (!id.success) return Response.json({ error: 'Not found' }, { status: 404 })
  const review = await getPublicReviewApiModel(id.data)
  return review ? Response.json(review) : Response.json({ error: 'Not found' }, { status: 404 })
}
