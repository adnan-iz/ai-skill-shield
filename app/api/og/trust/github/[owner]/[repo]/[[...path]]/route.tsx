import { ImageResponse } from 'next/og'
import { buildInstallDecision } from '@/lib/report/install-decision'
import { getPublicTrustResult } from '@/lib/trust-server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ owner: string; repo: string; path?: string[] }> }
) {
  const { owner, repo, path } = await params
  const result = await getPublicTrustResult(owner, repo, path)
  const decision = result ? buildInstallDecision(result, null) : null
  const accent = !decision
    ? '#64748b'
    : decision.tone === 'safe'
      ? '#22c55e'
      : decision.tone === 'danger'
        ? '#ef4444'
        : '#eab308'
  const repoLabel = `${owner}/${repo}`.slice(0, 80)
  const skillPath = path?.join('/').slice(0, 110)

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#07110d', color: '#f8fafc', padding: '64px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#86efac', fontSize: 26, fontWeight: 700 }}>
          <div style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #22c55e', borderRadius: 10 }}>S</div>
          SkillShield public trust report
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, letterSpacing: '-2px' }}>{repoLabel}</div>
          {skillPath && <div style={{ display: 'flex', marginTop: 12, color: '#94a3b8', fontSize: 26 }}>/{skillPath}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginTop: 44 }}>
            <div style={{ display: 'flex', color: accent, fontSize: 96, fontWeight: 900 }}>{result?.overallScore ?? '—'}</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', color: accent, fontSize: 34, fontWeight: 800 }}>{decision?.label || 'Report unavailable'}</div>
              <div style={{ display: 'flex', marginTop: 8, color: '#94a3b8', fontSize: 22 }}>{result ? `${result.findings.length} findings · default-branch source` : 'Run a public scan to publish trust status'}</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 20 }}>
          <span>Validate before installation</span>
          <span>{result ? new Date(result.timestamp).toISOString().slice(0, 10) : 'ai-skill-shield.suppeng.com'}</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
