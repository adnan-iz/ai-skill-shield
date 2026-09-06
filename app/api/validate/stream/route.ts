import { NextRequest } from 'next/server'
import { validateFiles, validatePayloadSize } from '@/lib/security/input-validation'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { tooManyRequests } from '@/lib/api-error'
import { ScanStreamController, runScanPipeline } from '@/lib/events/scan-stream'
import type { SkillInput } from '@/lib/validator/types'

function ipFromRequest(request: NextRequest | Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function POST(request: NextRequest) {
  const clientIp = ipFromRequest(request)

  let rl: { allowed: boolean; limit: number; remaining: number; resetAt: number } | null = null
  try {
    rl = await checkRateLimit(`validate-stream:${clientIp}`, { maxRequests: 30, windowMs: 60_000 })
    if (!rl.allowed) {
      return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)
    }
  } catch {
    // Database or rate limit service not available (e.g. test environment); proceed gracefully
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const streamCtrl = new ScanStreamController(controller)

      try {
        let raw: string
        try {
          raw = await request.text()
        } catch {
          throw new Error('Failed to read request body')
        }

        const sizeError = validatePayloadSize(raw)
        if (sizeError) {
          throw new Error(sizeError)
        }

        let body: SkillInput
        try {
          body = JSON.parse(raw)
        } catch {
          throw new Error('Invalid JSON payload')
        }

        const filesError = validateFiles(body?.files)
        if (filesError) {
          throw new Error(filesError)
        }

        const url = new URL(request.url)
        const rescan = url.searchParams.get('rescan') === 'true'

        await runScanPipeline(body, streamCtrl, { rescan })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown validation error'
        streamCtrl.emitStep('error', 100, message, {
          data: { error: message },
        })
      } finally {
        try {
          controller.close()
        } catch {
          // Stream already closed
        }
      }
    },
  })

  const response = new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })

  return rl ? addRateLimitHeaders(response, rl) : response
}
