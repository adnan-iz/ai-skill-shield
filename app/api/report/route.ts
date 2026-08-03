import { NextRequest } from 'next/server'
import { getResult } from '@/lib/store'
import { validateId } from '@/lib/security/input-validation'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { badRequest, tooManyRequests, notFound } from '@/lib/api-error'
import { generateSarifReport } from '@/lib/report/sarif'
import type { ValidationResult } from '@/lib/validator/types'

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function classToken(value: unknown): string {
  return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '')
}

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

function generateHtmlReport(result: ValidationResult): string {
  const findingRows = result.findings
    .map(
      (f) => `
    <tr>
      <td><span class="sev sev-${classToken(f.severity)}">${escapeHtml(f.severity.toUpperCase())}</span></td>
      <td>${escapeHtml(f.category)}</td>
      <td>${escapeHtml(f.title)}</td>
      <td>${escapeHtml(f.filePath || 'SKILL.md')}:${escapeHtml(f.lineNumber || '-')}</td>
      <td>${escapeHtml(f.recommendation || '-')}</td>
    </tr>`
    )
    .join('')

  const compatCards = result.compatibility.agents
    .map((c) => `<span class="compat ${classToken(c.status)}">${escapeHtml(c.name)}</span>`)
    .join('')

  const scoreColor =
    result.overallScore >= 70
      ? '#16a34a'
      : result.overallScore >= 50
      ? '#ca8a04'
      : result.overallScore >= 30
      ? '#ea580c'
      : '#dc2626'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Skill Shield Report - ${escapeHtml(result.skillName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; color: #18181b; background: #fff; }
    h1 { font-size: 1.5rem; margin-bottom: 0.25rem; }
    h2 { font-size: 1.125rem; margin: 1.5rem 0 0.75rem; }
    .score { font-size: 3rem; font-weight: 700; color: ${scoreColor}; }
    .meta { color: #71717a; font-size: 0.875rem; margin-bottom: 2rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e4e4e7; font-size: 0.875rem; }
    th { font-weight: 600; color: #71717a; background: #fafafa; }
    .sev { font-weight: 600; font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 999px; }
    .sev-critical { background: #fef2f2; color: #dc2626; }
    .sev-high { background: #fff7ed; color: #ea580c; }
    .sev-medium { background: #fefce8; color: #ca8a04; }
    .sev-low { background: #f7fee7; color: #65a30d; }
    .sev-info { background: #eff6ff; color: #2563eb; }
    .compat { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 500; margin: 0.25rem; }
    .full { background: #ecfdf5; color: #047857; }
    .partial { background: #ecfccb; color: #4d7c0f; }
    .unknown { background: #fafafa; color: #71717a; }
    .incompatible { background: #fef2f2; color: #991b1b; }
    .axis-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-top: 0.5rem; }
    .axis-card { padding: 0.75rem; border: 1px solid #e4e4e7; border-radius: 0.5rem; }
    .axis-name { font-weight: 500; font-size: 0.875rem; }
    .axis-score { font-weight: 700; font-size: 1.125rem; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e4e4e7; font-size: 0.75rem; color: #a1a1aa; }
  </style>
</head>
<body>
  <h1>${escapeHtml(result.skillName)}</h1>
  <div class="score">${escapeHtml(result.overallScore)}/100</div>
  <div class="meta">
    Highest Finding: ${escapeHtml(result.riskLevel.toUpperCase())} &middot;
    ${escapeHtml(result.findings.length)} findings &middot;
    ${escapeHtml(new Date(result.timestamp).toLocaleString())}
  </div>

  <h2>Axis Assessment</h2>
  <div class="axis-grid">
    ${result.axes.map((a) => {
      const ac = a.score >= 70 ? '#16a34a' : a.score >= 50 ? '#ca8a04' : a.score >= 30 ? '#ea580c' : '#dc2626'
      return `<div class="axis-card"><div class="axis-name">${escapeHtml(a.name)}</div><div class="axis-score" style="color: ${ac}">${escapeHtml(a.score)}</div><div style="font-size:0.75rem;color:#71717a">${escapeHtml(a.status)}</div></div>`
    }).join('')}
  </div>

  <h2>Findings (${result.findings.length})</h2>
  ${result.findings.length === 0 ? '<p>No issues found.</p>' : `<table><thead><tr><th>Severity</th><th>Category</th><th>Title</th><th>File:Line</th><th>Recommendation</th></tr></thead><tbody>${findingRows}</tbody></table>`}

  <h2>Agent Compatibility</h2>
  <div>${compatCards}</div>

  <h2>Frontmatter</h2>
  <pre style="background:#fafafa;padding:0.75rem;border-radius:0.5rem;font-size:0.75rem;overflow:auto;max-height:200px">${escapeHtml(JSON.stringify(result.skillPreview.frontmatter, null, 2))}</pre>

  <div class="footer">Generated by AI Skill Shield &mdash; Agent Skills Validator</div>
</body>
</html>`
}
