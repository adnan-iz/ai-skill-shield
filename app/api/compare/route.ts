import { NextRequest } from 'next/server'
import { getResult } from '@/lib/store'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { badRequest, tooManyRequests, notFound } from '@/lib/api-error'
import { validateId } from '@/lib/security/input-validation'
import type { Finding } from '@/lib/validator/types'

function ipFromRequest(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function findingKey(f: Finding): string {
  return `${f.category}|${f.title}|${f.filePath || ''}|${f.lineNumber || 0}`
}

export async function POST(request: NextRequest) {
  const clientIp = ipFromRequest(request)

  const rl = await checkRateLimit(`compare:${clientIp}`, { maxRequests: 30, windowMs: 60_000 })
  if (!rl.allowed) {
    return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)
  }

  let body: { scanAId?: string; scanBId?: string }
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON')
  }

  const { scanAId, scanBId } = body
  if (!scanAId || !scanBId) {
    return badRequest('Missing scanAId or scanBId')
  }
  if (validateId(scanAId) || validateId(scanBId)) {
    return badRequest('Invalid scan ID')
  }

  const [scanA, scanB] = await Promise.all([getResult(scanAId), getResult(scanBId)])

  if (!scanA) {
    return notFound('Scan A not found')
  }
  if (!scanB) {
    return notFound('Scan B not found')
  }

  const scoreDiff = scanB.overallScore - scanA.overallScore
  const riskLevelDiff = `${scanA.riskLevel} → ${scanB.riskLevel}`

  const aKeys = new Set(scanA.findings.map(findingKey))
  const bKeys = new Set(scanB.findings.map(findingKey))

  const sharedFindings = scanA.findings.filter((f) => bKeys.has(findingKey(f)))
  const uniqueToA = scanA.findings.filter((f) => !bKeys.has(findingKey(f)))
  const uniqueToB = scanB.findings.filter((f) => !aKeys.has(findingKey(f)))

  const axesDiff = scanA.axes
    .map((a) => {
      const b = scanB.axes.find((bx) => bx.name === a.name)
      if (!b) return null
      return {
        axis: a.name,
        a: a.score,
        b: b.score,
        diff: b.score - a.score,
      }
    })
    .filter((x): x is { axis: string; a: number; b: number; diff: number } => x !== null)

  return addRateLimitHeaders(
    Response.json({
      scanA,
      scanB,
      scoreDiff,
      riskLevelDiff,
      sharedFindings,
      uniqueToA,
      uniqueToB,
      axesDiff,
    }),
    rl
  )
}
