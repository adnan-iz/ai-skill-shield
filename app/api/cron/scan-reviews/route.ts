import { processQueuedScanReviews } from '@/lib/review/queue'

export const dynamic = 'force-dynamic'

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    return Response.json({ ok: true, ...(await processQueuedScanReviews()) })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'Scan review cron failed',
      error: error instanceof Error ? error.message : String(error),
    }))
    return Response.json({ ok: false }, { status: 500 })
  }
}
