import { ensureDatabase, getDatabase } from '@/lib/db'
import { getResult } from '@/lib/store'
import { notifyGitHubRepositoryOwner } from '@/lib/github/notifications'
import { logAuditEvent } from '@/lib/webhooks'

const MAX_ATTEMPTS = 3

export async function enqueueGitHubNotification(scanId: string, runAt: number): Promise<void> {
  await ensureDatabase()
  const { client } = getDatabase()
  const now = Date.now()
  await client.query(
    `INSERT INTO github_notification_jobs (scan_id, status, run_at, attempts, created_at)
     VALUES ($1, 'queued', $2, 0, $3)
     ON CONFLICT (scan_id) DO UPDATE
       SET status = 'queued', run_at = LEAST(github_notification_jobs.run_at, EXCLUDED.run_at), last_error = NULL`,
    [scanId, runAt, now]
  )
}

interface ClaimedJob {
  scan_id: string
  attempts: number
}

export async function processQueuedGitHubNotifications(limit = 10): Promise<{ claimed: number; completed: number; retried: number; failed: number }> {
  await ensureDatabase()
  const { client } = getDatabase()
  const now = Date.now()
  const claimed = await client.query<ClaimedJob>(
    `WITH due AS (
       SELECT scan_id
       FROM github_notification_jobs
       WHERE status = 'queued' AND run_at <= $1
       ORDER BY run_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED
     )
     UPDATE github_notification_jobs job
     SET status = 'processing', attempts = job.attempts + 1, started_at = $1
     FROM due
     WHERE job.scan_id = due.scan_id
     RETURNING job.scan_id, job.attempts`,
    [now, Math.max(1, Math.min(limit, 10))]
  )

  let completed = 0
  let retried = 0
  let failed = 0
  for (const job of claimed.rows) {
    try {
      const result = await getResult(job.scan_id)
      if (!result) throw new Error('Scan result was not found')
      const outcome = await notifyGitHubRepositoryOwner(result, { allowBotFallback: true })
      if (outcome === 'notified' || outcome === 'already-notified') {
        await client.query(
          `UPDATE github_notification_jobs SET status = 'completed', completed_at = $2, last_error = NULL WHERE scan_id = $1`,
          [job.scan_id, Date.now()]
        )
        await logAuditEvent('github.owner_notification_sent_from_queue', job.scan_id, { outcome }).catch(() => {})
        completed++
      } else {
        await failJob(job.scan_id, job.attempts, `Notification outcome: ${outcome}`)
        failed++
      }
    } catch (error) {
      const retriedJob = await failJob(job.scan_id, job.attempts, error instanceof Error ? error.message : String(error))
      if (retriedJob) retried++
      else failed++
    }
  }

  return { claimed: claimed.rowCount || 0, completed, retried, failed }
}

async function failJob(scanId: string, attempts: number, error: string): Promise<boolean> {
  const { client } = getDatabase()
  const retry = attempts < MAX_ATTEMPTS
  await client.query(
    `UPDATE github_notification_jobs
     SET status = $2, run_at = $3, last_error = $4, completed_at = CASE WHEN $2 = 'failed' THEN $5 ELSE NULL END
     WHERE scan_id = $1`,
    [scanId, retry ? 'queued' : 'failed', Date.now() + 60_000, error.slice(0, 2_000), Date.now()]
  )
  return retry
}
