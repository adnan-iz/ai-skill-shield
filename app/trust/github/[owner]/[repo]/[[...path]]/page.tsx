import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import ScoreGauge from '@/components/report/score-gauge'
import { notFound } from 'next/navigation'
import TrustActions from '@/components/trust/trust-actions'
import { buildInstallDecision } from '@/lib/report/install-decision'
import { githubBadgePath, githubTrustImagePath, githubTrustPath, parseGitHubTrustTarget } from '@/lib/trust'
import { getPublicTrustResult } from '@/lib/trust-server'
import type { Finding } from '@/lib/validator/types'

export const dynamic = 'force-dynamic'

type Props = {
  params: Promise<{ owner: string; repo: string; path?: string[] }>
}

const severityOrder: Record<Finding['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { owner, repo, path } = await params
  const target = parseGitHubTrustTarget(owner, repo, path)
  if (!target) return { title: 'Trust report unavailable', robots: { index: false, follow: false } }

  const result = await getPublicTrustResult(target.owner, target.repo, target.path)
  if (!result) return { title: 'Trust report unavailable', robots: { index: false, follow: false } }

  const decision = buildInstallDecision(result, null)
  const title = `${target.owner}/${target.repo} — ${decision.label}`
  const description = `${result.skillName} scored ${result.overallScore}/100 with ${result.findings.length} findings in its latest default-branch AI Skill Shield scan.`
  const canonical = githubTrustPath(target)
  const image = githubTrustImagePath(target)

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: 'article', url: canonical, images: [{ url: image, width: 1200, height: 630, alt: 'AI Skill Shield public trust report' }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function TrustPage({ params }: Props) {
  const { owner, repo, path } = await params
  const target = parseGitHubTrustTarget(owner, repo, path)
  if (!target) notFound()

  const result = await getPublicTrustResult(target.owner, target.repo, target.path)
  if (!result) notFound()

  const source = result.source!
  const meta = source.repositoryMeta!
  const audit = source.repositoryAudit
  const decision = buildInstallDecision(result, null)
  const trustPath = githubTrustPath(target)
  const badgePath = githubBadgePath(target)
  const repoLabel = `${target.owner}/${target.repo}`
  const sourceUrl = `https://github.com/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}/tree/${source.sha}${target.path ? `/${target.path.split('/').map(encodeURIComponent).join('/')}` : ''}`
  const topFindings = [...result.findings]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 5)
  const toneClasses = {
    safe: 'border-shield-200 bg-shield-50 text-shield-800',
    warn: 'border-yellow-200 bg-yellow-50 text-yellow-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-on-surface-secondary hover:text-on-surface">
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          AI Skill Shield
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-shield-200 bg-shield-50 px-3 py-1 text-xs font-semibold text-shield-800">
          <span className="material-symbols-outlined text-sm">public</span>
          Default-branch GitHub scan
        </span>
      </div>

      <section className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-outline bg-surface-container/70 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-shield-600">Trust report</p>
              <h1 className="mt-2 break-words text-3xl font-bold text-on-surface">{repoLabel}</h1>
              {target.path && <p className="mt-1 break-all font-mono text-sm text-on-surface-secondary">/{target.path}</p>}
              <p className="mt-3 max-w-2xl text-sm text-on-surface-secondary">{meta.description || result.skillName}</p>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-shield-700 hover:text-shield-800"
              >
                View scanned commit on GitHub
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </div>
            <div className="shrink-0">
              <ScoreGauge score={result.overallScore} riskLevel={result.riskLevel} compact />
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 sm:grid-cols-2 sm:p-8">
          <div className={`rounded-xl border p-5 ${toneClasses[decision.tone]}`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-70">Install decision</p>
            <h2 className="mt-2 text-2xl font-bold">{decision.label}</h2>
            <p className="mt-2 text-sm leading-6 opacity-90">{decision.summary}</p>
          </div>
          <div className="rounded-xl border border-outline bg-surface-secondary/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">Scan identity</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-on-surface-secondary">Scanned</dt><dd className="font-medium text-on-surface">{new Date(result.timestamp).toISOString().slice(0, 10)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-on-surface-secondary">Commit</dt><dd className="font-mono text-xs font-medium text-on-surface">{source.sha?.slice(0, 12) || 'default branch'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-on-surface-secondary">License</dt><dd className="font-medium text-on-surface">{meta.license || 'Not detected'}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-on-surface-secondary">Repository</dt><dd className="font-medium text-on-surface">{meta.archived ? 'Archived' : 'Active'}</dd></div>
            </dl>
          </div>
        </div>

        <div className="grid gap-5 border-t border-outline p-6 sm:grid-cols-3 sm:p-8">
          <div><p className="text-2xl font-bold text-on-surface">{result.findings.length}</p><p className="text-xs text-on-surface-secondary">validation findings</p></div>
          <div><p className="text-2xl font-bold text-on-surface">{audit?.summary.installSurfaceCount ?? 0}</p><p className="text-xs text-on-surface-secondary">install surfaces reviewed</p></div>
          <div><p className="text-2xl font-bold text-on-surface">{meta.stars.toLocaleString()}</p><p className="text-xs text-on-surface-secondary">GitHub stars</p></div>
        </div>
      </section>

      <section className="glass-card mt-6 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-on-surface">Highest-priority findings</h2>
            <p className="mt-1 text-xs text-on-surface-secondary">The latest default-branch scan, ordered by severity.</p>
          </div>
          <Link href={`/validate/${result.id}`} className="text-sm font-semibold text-shield-700 hover:text-shield-800">Full report</Link>
        </div>
        {topFindings.length === 0 ? (
          <div className="mt-5 rounded-lg border border-shield-200 bg-shield-50 p-4 text-sm text-shield-800">No findings were raised in this scan.</div>
        ) : (
          <ul className="mt-5 divide-y divide-outline">
            {topFindings.map((finding) => (
              <li key={finding.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-3">
                <span className="w-20 shrink-0 text-xs font-bold uppercase text-on-surface-secondary">{finding.severity}</span>
                <span className="font-medium text-on-surface">{finding.title}</span>
                <span className="sm:ml-auto font-mono text-xs text-on-surface-secondary">{finding.filePath || 'SKILL.md'}{finding.lineNumber ? `:${finding.lineNumber}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 flex justify-center">
        <Image
          src={badgePath}
          alt={`AI Skill Shield status for ${repoLabel}`}
          width={230}
          height={20}
          unoptimized
        />
      </div>
      <div className="mt-6">
        <TrustActions badgePath={badgePath} repoLabel={repoLabel} scanId={result.id} trustPath={trustPath} />
      </div>
      <p className="mt-5 text-center text-xs leading-5 text-on-surface-secondary">
        AI Skill Shield is an automated pre-install review, not a guarantee of safety. Confirm sensitive permissions and execution paths before installation.
      </p>
    </div>
  )
}
