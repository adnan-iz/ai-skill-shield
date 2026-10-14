import { z } from 'zod'
import { runDeepScan } from '@/lib/deep-scan'
import { sourceEvidence } from '@/lib/deep-scan/source-evidence'
import { getResult } from '@/lib/store'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'

export const runtime = 'nodejs'
const requestSchema = z.object({ scanId: z.string().min(1).max(100), transitive: z.boolean().optional(), depth: z.number().int().min(1).max(2).optional() }).strict()

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rate = await checkRateLimit(`deep-scan:${ip}`, { maxRequests: 3, windowMs: 60_000 })
  const reply = (body: unknown, status = 200) => addRateLimitHeaders(Response.json(body, { status }), rate)
  if (!rate.allowed) return reply({ error: 'Too many requests' }, 429)
  let body: z.infer<typeof requestSchema>
  try { body = requestSchema.parse(await request.json()) } catch { return reply({ error: 'Expected scanId and optional transitive/depth.' }, 400) }
  try {
    const scan = await getResult(body.scanId)
    if (!scan) return reply({ error: 'Stored scan not found' }, 404)
    const result = await runDeepScan(scan.skillPreview.files || [], { transitive: body.transitive, depth: body.depth, source: scan.source, recursive: !!scan.batch })
    return reply({ ...result, scanId: scan.id, source: scan.source, sourceFiles: sourceEvidence(scan.skillPreview.files || []), deterministicFindings: scan.findings })
  } catch { return reply({ status: 'unavailable', findings: [], reason: 'Stored scan could not be read.' }, 503) }
}
