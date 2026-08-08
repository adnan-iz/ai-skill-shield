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

const severityClasses: Record<Finding['severity'], string> = {
  critical: 'bg-red-500/10 text-red-500 ring-1 ring-inset ring-red-500/25',
  high: 'bg-orange-500/10 text-orange-500 ring-1 ring-inset ring-orange-500/25',
  medium: 'bg-yellow-500/10 text-yellow-600 ring-1 ring-inset ring-yellow-500/25',
  low: 'bg-shield-500/10 text-shield-600 ring-1 ring-inset ring-shield-500/25',
  info: 'bg-sky-500/10 text-sky-500 ring-1 ring-inset ring-sky-500/25',
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
  const rescanUrl = `https://github.com/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}${target.path ? `/tree/${encodeURIComponent(source.branch || meta.defaultBranch || 'main')}/${target.path.split('/').map(encodeURIComponent).join('/')}` : ''}`
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
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-shield-600">Trust report</p>
              <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-on-surface sm:text-4xl">{repoLabel}</h1>
              {target.path && <p className="mt-1 break-all font-mono text-sm text-on-surface-secondary">/{target.path}</p>}
              <p className="mt-3 max-w-2xl text-base leading-6 text-on-surface-secondary">{meta.description || result.skillName}</p>
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-shield-700 hover:text-shield-800"
              >
                View scanned commit on GitHub
                <span className="material-symbols-outlined text-base">open_in_new</span>
              </a>
            </div>
            <div className="flex items-center gap-4 rounded-xl border border-outline bg-surface-secondary/40 p-4 lg:w-52 lg:flex-col lg:text-center">
              <ScoreGauge score={result.overallScore} riskLevel={result.riskLevel} compact />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">Latest scan</p>
                <p className="mt-1 text-sm font-semibold text-on-surface">{result.riskLevel} severity</p>
                <p className="mt-1 text-xs text-on-surface-secondary">Static analysis score</p>
              </div>
            </div>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-outline pt-5">
            <Link href={`/validate/${result.id}`} className="rounded-lg bg-shield-600 px-4 py-2 text-sm font-semibold text-white hover:bg-shield-700">
              View full report
            </Link>
            <Link
              href={`/validate/${result.id}#ai-review`}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary/80"
            >
              AI review
            </Link>
            <Link
              href={`/?ref=trust-report&refScan=${encodeURIComponent(result.id)}&url=${encodeURIComponent(rescanUrl)}`}
              className="rounded-lg border border-outline px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-secondary"
            >
              Rescan repository
            </Link>
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

        <div className="border-t border-outline bg-surface-secondary/20 p-6 sm:p-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-on-surface-secondary">Repository scan summary</p>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">
                <span className="material-symbols-outlined normal-case tracking-normal rounded-md bg-red-500/10 p-1 text-base text-red-500">policy</span>
                Findings
              </dt>
              <dd className="mt-4 text-3xl font-bold tracking-tight text-on-surface">{result.findings.length.toLocaleString()}</dd>
              <p className="mt-1 text-xs text-on-surface-secondary">Validation findings detected</p>
            </div>
            <div className="rounded-xl border border-outline bg-surface-container/60 p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">
                <span className="material-symbols-outlined normal-case tracking-normal rounded-md bg-yellow-500/10 p-1 text-base text-yellow-600">terminal</span>
                Install surface
              </dt>
              <dd className="mt-4 text-3xl font-bold tracking-tight text-on-surface">{audit?.summary.installSurfaceCount ?? 0}</dd>
              <p className="mt-1 text-xs text-on-surface-secondary">Execution paths reviewed</p>
            </div>
            <div className="rounded-xl border border-outline bg-surface-container/60 p-4">
              <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">
                <span aria-hidden="true" className="rounded-md bg-shield-500/10 px-1.5 py-1 text-base leading-none text-shield-600">★</span>
                Repository reach
              </dt>
              <dd className="mt-4 text-3xl font-bold tracking-tight text-on-surface">{meta.stars.toLocaleString()}</dd>
              <p className="mt-1 text-xs text-on-surface-secondary">GitHub stars</p>
            </div>
          </dl>
        </div>
      </section>

      <section className="glass-card mt-6 rounded-xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-red-500">Highest-priority findings</h2>
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
                <span className={`w-fit shrink-0 rounded-full px-2 py-1 text-[10px] font-bold uppercase leading-none sm:w-20 sm:text-center ${severityClasses[finding.severity]}`}>
                  {finding.severity}
                </span>
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
