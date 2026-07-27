import { NextRequest } from 'next/server'
import { validateAndSave } from '@/lib/validator/service'
import { validateFiles, validatePayloadSize } from '@/lib/security/input-validation'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { badRequest, tooManyRequests, notFound, serverError } from '@/lib/api-error'
import type { SkillInput } from '@/lib/validator/types'

function ipFromRequest(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(request: NextRequest) {
  const clientIp = ipFromRequest(request)

  const rl = await checkRateLimit(`validate:${clientIp}`, { maxRequests: 30, windowMs: 60_000 })
  if (!rl.allowed) {
    return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)
  }

  try {
    const raw = await request.text()

    const sizeError = validatePayloadSize(raw)
    if (sizeError) {
      return badRequest(sizeError)
    }

    const body: SkillInput = JSON.parse(raw)

    const filesError = validateFiles(body.files)
    if (filesError) {
      return badRequest(filesError)
    }

    const result = await validateAndSave(body)

    return addRateLimitHeaders(Response.json(result, { status: 200 }), rl)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return badRequest('Invalid JSON')
    }
    return serverError()
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return badRequest('Missing id parameter')
  }

  const { getResult } = await import('@/lib/store')
  const result = await getResult(id)
  if (!result) {
    return notFound('Result not found')
  }

  return Response.json(result)
}
