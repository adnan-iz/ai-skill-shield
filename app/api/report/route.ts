import { NextRequest } from 'next/server'
import { getResult } from '@/lib/store'
import { validateId } from '@/lib/security/input-validation'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { badRequest, tooManyRequests, notFound } from '@/lib/api-error'
import { generateSarifReport } from '@/lib/report/sarif'
import { generateHtmlReport } from '@/lib/report/pdf'

function ipFromRequest(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function GET(request: NextRequest) {
  const clientIp = ipFromRequest(request)

  const rl = await checkRateLimit(`report:${clientIp}`, { maxRequests: 30, windowMs: 60_000 })
  if (!rl.allowed) {
    return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)
  }

  const id = request.nextUrl.searchParams.get('id')
  const format = request.nextUrl.searchParams.get('format') || 'json'

  if (!id) {
    return badRequest('Missing id parameter')
  }

  const idError = validateId(id)
  if (idError) {
    return badRequest(idError)
  }

  const result = await getResult(id)

  if (!result) {
    return notFound('Result not found')
  }

  if (format === 'json') {
    return addRateLimitHeaders(Response.json(result), rl)
  }

  if (format === 'html') {
    const html = generateHtmlReport(result)
    return addRateLimitHeaders(new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    }), rl)
  }

  if (format === 'pdf') {
    const html = generateHtmlReport(result)
    return addRateLimitHeaders(new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="skillshield-${id}-print.html"`,
      },
    }), rl)
  }

  if (format === 'sarif') {
    const sarif = generateSarifReport(result)
    return addRateLimitHeaders(new Response(JSON.stringify(sarif, null, 2), {
      headers: {
        'Content-Type': 'application/sarif+json',
        'Content-Disposition': `attachment; filename="skillshield-${id}.sarif"`,
      },
    }), rl)
  }

  return badRequest('Unsupported format. Use json, html, pdf, or sarif')
}
