import { db, ensureDatabase } from '@/lib/db'
import { approvals } from '@/lib/db/schema'
import { eq, count } from 'drizzle-orm'

export interface Approval {
  id: string
  scanId: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy: string | null
  reviewNotes: string | null
  createdAt: number
  reviewedAt: number | null
}

export async function getApprovalForScan(scanId: string): Promise<Approval | null> {
  await ensureDatabase()

  const rows = await db.select().from(approvals).where(eq(approvals.scanId, scanId)).limit(1)
  return rows[0] || null
}

export async function approveScan(scanId: string, reviewer?: string, notes?: string): Promise<void> {
  await ensureDatabase()

  const existing = await getApprovalForScan(scanId)
  const now = Date.now()
  if (existing) {
    await db.update(approvals)
      .set({ status: 'approved', reviewedBy: reviewer || null, reviewNotes: notes || null, reviewedAt: now })
      .where(eq(approvals.id, existing.id))
  } else {
    await db.insert(approvals).values({
      id: crypto.randomUUID(),
      scanId,
      status: 'approved',
      reviewedBy: reviewer || null,
      reviewNotes: notes || null,
      createdAt: now,
      reviewedAt: now,
    })
  }
}

export async function rejectScan(scanId: string, reviewer?: string, notes?: string): Promise<void> {
  await ensureDatabase()

  const existing = await getApprovalForScan(scanId)
  const now = Date.now()
  if (existing) {
    await db.update(approvals)
      .set({ status: 'rejected', reviewedBy: reviewer || null, reviewNotes: notes || null, reviewedAt: now })
      .where(eq(approvals.id, existing.id))
  } else {
    await db.insert(approvals).values({
      id: crypto.randomUUID(),
      scanId,
      status: 'rejected',
      reviewedBy: reviewer || null,
      reviewNotes: notes || null,
      createdAt: now,
      reviewedAt: now,
    })
  }
}

export async function listApprovals(status?: 'pending' | 'approved' | 'rejected', limit?: number): Promise<Approval[]> {
  await ensureDatabase()

  const query = db.select().from(approvals)
  if (status) {
    query.where(eq(approvals.status, status))
  }
  if (limit) {
    query.limit(limit)
  }
  return await query
}

export async function getPendingApprovalCount(): Promise<number> {
  await ensureDatabase()

  const rows = await db.select({ count: count() }).from(approvals).where(eq(approvals.status, 'pending'))
  return rows[0]?.count ?? 0
}

export async function createPendingApproval(scanId: string): Promise<void> {
  await ensureDatabase()

  await db.insert(approvals).values({
    id: crypto.randomUUID(),
    scanId,
    status: 'pending',
    reviewedBy: null,
    reviewNotes: null,
    createdAt: Date.now(),
    reviewedAt: null,
  })
}
