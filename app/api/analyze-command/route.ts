import { NextRequest } from 'next/server'
import { analyzeInstallCommand } from '@/lib/scanner/command-analyzer'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { badRequest, tooManyRequests, serverError } from '@/lib/api-error'

function ipFromRequest(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(request: NextRequest) {
  const clientIp = ipFromRequest(request)

  const rl = await checkRateLimit(`analyze-command:${clientIp}`, { maxRequests: 60, windowMs: 60_000 })
  if (!rl.allowed) {
    return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)
  }

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return addRateLimitHeaders(badRequest('Invalid JSON body'), rl)
    }

    if (!body || typeof body !== 'object' || !('command' in body)) {
      return addRateLimitHeaders(badRequest('Missing "command" field in request body'), rl)
    }

    const { command } = body as { command: unknown }
    if (typeof command !== 'string' || command.trim() === '') {
      return addRateLimitHeaders(badRequest('Field "command" must be a non-empty string'), rl)
    }

    const result = analyzeInstallCommand(command)
    return addRateLimitHeaders(Response.json(result, { status: 200 }), rl)
  } catch {
    return addRateLimitHeaders(serverError(), rl)
  }
}
