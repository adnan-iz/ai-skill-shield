import { buildInstallDecision } from '@/lib/report/install-decision'
import { getPublicTrustResult } from '@/lib/trust-server'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; path?: string[] }> }
) {
  const { owner, repo, path } = await params
  const result = await getPublicTrustResult(owner, repo, path)
  const decision = result ? buildInstallDecision(result, null) : null
  const status = !result
    ? 'not scanned'
    : decision?.tone === 'safe'
      ? `safe ${result.overallScore}`
      : decision?.tone === 'danger'
        ? `do not install ${result.overallScore}`
        : `review ${result.overallScore}`
  const color = !result
    ? '#64748b'
    : decision?.tone === 'safe'
      ? '#16a34a'
      : decision?.tone === 'danger'
        ? '#dc2626'
        : '#ca8a04'
  const leftWidth = 82
  const rightWidth = 148
  const width = leftWidth + rightWidth

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="20" role="img" aria-label="SkillShield: ${escapeXml(status)}">
  <title>SkillShield: ${escapeXml(status)}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-opacity=".12"/></linearGradient>
  <clipPath id="r"><rect width="${width}" height="20" rx="3"/></clipPath>
  <g clip-path="url(#r)"><rect width="${leftWidth}" height="20" fill="#0f172a"/><rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${color}"/><rect width="${width}" height="20" fill="url(#s)"/></g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${leftWidth / 2}" y="15" fill="#010101" fill-opacity=".3">skillshield</text><text x="${leftWidth / 2}" y="14">skillshield</text>
    <text x="${leftWidth + rightWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(status)}</text><text x="${leftWidth + rightWidth / 2}" y="14">${escapeXml(status)}</text>
  </g>
</svg>`

  return new Response(svg, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
