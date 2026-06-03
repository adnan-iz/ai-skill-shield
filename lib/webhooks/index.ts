import { db, ensureDatabase } from '@/lib/db'
import { webhooks, auditLogs } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export interface WebhookPayload {
  event: string
  scanId: string
  timestamp: string
  data: {
    score: number
    riskLevel: string
    skillName: string
    findingsCount: number
    criticalCount: number
    highCount: number
    sourceUrl?: string
  }
}

export async function triggerWebhooks(event: string, scanId: string, data: WebhookPayload['data']): Promise<void> {
  await ensureDatabase()

  const hooks = await db.select().from(webhooks)
    .where(and(eq(webhooks.enabled, true)))

  const payload: WebhookPayload = { event, scanId, timestamp: new Date().toISOString(), data }

  for (const hook of hooks) {
    if (!hook.enabled) continue
    const events: string[] = JSON.parse(hook.events)
    if (!events.includes(event) && !events.includes('*')) continue

    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      })

      await db.update(webhooks)
        .set({ lastTriggeredAt: Date.now(), lastStatusCode: res.status })
        .where(eq(webhooks.id, hook.id))

      await logAuditEvent('webhook.sent', scanId, { url: hook.url, status: res.status })
    } catch (err) {
      await db.update(webhooks)
        .set({ lastTriggeredAt: Date.now(), lastStatusCode: 0 })
        .where(eq(webhooks.id, hook.id))

      await logAuditEvent('webhook.failed', scanId, { url: hook.url, error: String(err) })
    }
  }
}

export async function logAuditEvent(event: string, scanId?: string, metadata?: Record<string, unknown>): Promise<void> {
  await ensureDatabase()

  const { v4: uuid } = await import('uuid')
  await db.insert(auditLogs).values({
    id: uuid(),
    event,
    scanId: scanId || null,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdAt: Date.now(),
  })
}

export async function registerWebhook(url: string, events: string[], secret?: string): Promise<void> {
  await ensureDatabase()

  const { v4: uuid } = await import('uuid')
  await db.insert(webhooks).values({
    id: uuid(),
    url,
    events: JSON.stringify(events),
    secret: secret || null,
    enabled: true,
    createdAt: Date.now(),
  })
}

export async function listWebhooks(): Promise<typeof webhooks.$inferSelect[]> {
  await ensureDatabase()

  return db.select().from(webhooks).orderBy(webhooks.createdAt)
}

export async function deleteWebhook(id: string): Promise<void> {
  await ensureDatabase()

  await db.delete(webhooks).where(eq(webhooks.id, id))
}
