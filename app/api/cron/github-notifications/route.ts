import { processQueuedGitHubNotifications } from '@/lib/github/notification-queue'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await processQueuedGitHubNotifications()
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'GitHub notification cron failed',
      error: error instanceof Error ? error.message : String(error),
    }))
    return Response.json({ ok: false }, { status: 500 })
  }
}
