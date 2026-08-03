import type { Metadata } from 'next'
import Link from 'next/link'
import { buildInstallDecision } from '@/lib/report/install-decision'
import { githubTrustPath, trustTargetForResult } from '@/lib/trust'
import { getRecentPublicResults } from '@/lib/store'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Explore Public Skill Scans',
  description: 'Search recent public GitHub skill scans with evidence-backed install decisions.',
  alternates: { canonical: '/explore' },
}

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function ExplorePage({ searchParams }: Props) {
  const { q = '' } = await searchParams
  const query = q.trim().toLowerCase()
  const publicResults = await getRecentPublicResults()
  const results = query
    ? publicResults.filter((result) => {
        const target = trustTargetForResult(result)
        return `${target?.owner}/${target?.repo}/${target?.path} ${result.skillName}`.toLowerCase().includes(query)
      })
    : publicResults

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-shield-600">Public evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-on-surface">Explore verified public scans</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-secondary">
          Latest default-branch scans of public GitHub repositories. Private uploads and link-only reports are never listed here.
        </p>
      </div>

      <form action="/explore" className="mb-6 flex flex-col gap-2 sm:flex-row" role="search">
        <label htmlFor="public-scan-search" className="sr-only">Search public scans</label>
        <input
          id="public-scan-search"
          name="q"
          defaultValue={q}
          placeholder="Search repository, path, or skill"
          className="min-w-0 flex-1 rounded-xl border border-outline bg-surface-container px-4 py-3 text-sm text-on-surface placeholder-on-surface-secondary/60 focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
        />
        <button type="submit" className="rounded-xl bg-shield-600 px-5 py-3 text-sm font-semibold text-white hover:bg-shield-700">Search</button>
      </form>

      <div className="mb-4 flex items-center justify-between text-sm text-on-surface-secondary">
        <span>{results.length} public scan{results.length === 1 ? '' : 's'}</span>
        {query && <Link href="/explore" className="font-semibold text-shield-700 hover:text-shield-800">Clear search</Link>}
      </div>

      {results.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined mb-3 inline-block text-4xl text-on-surface-secondary/40">travel_explore</span>
          <h2 className="font-semibold text-on-surface">{query ? 'No matching public scans' : 'No public scans yet'}</h2>
          <p className="mt-2 text-sm text-on-surface-secondary">
            {query ? 'Try a repository owner, name, or skill path.' : 'Scan a public default-branch GitHub skill to publish its trust report here.'}
          </p>
          {!query && <Link href="/" className="mt-5 inline-flex rounded-lg bg-shield-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-shield-700">Scan a public repository</Link>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {results.map((result) => {
            const target = trustTargetForResult(result)!
            const decision = buildInstallDecision(result, null)
            const path = githubTrustPath(target)
            const tone = decision.tone === 'safe'
              ? 'border-shield-200 bg-shield-50 text-shield-800'
              : decision.tone === 'warn'
              ? 'border-yellow-200 bg-yellow-50 text-yellow-900'
              : 'border-red-200 bg-red-50 text-red-900'

            return (
              <article key={path} className="glass-card flex min-w-0 flex-col rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-on-surface">{target.owner}/{target.repo}</h2>
                    <p className="mt-1 truncate font-mono text-xs text-on-surface-secondary">{target.path ? `/${target.path}` : '/SKILL.md'}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-2xl font-bold text-on-surface">{result.overallScore}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider text-on-surface-secondary">Static score</div>
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-6 text-on-surface-secondary">{result.source?.repositoryMeta?.description || result.skillName}</p>
                <div className={`mt-4 rounded-lg border px-3 py-2 text-sm font-semibold ${tone}`}>{decision.label}</div>
                <div className="mt-4 flex items-center justify-between text-xs text-on-surface-secondary">
                  <span>{result.findings.length} finding{result.findings.length === 1 ? '' : 's'}</span>
                  <span>{new Date(result.timestamp).toISOString().slice(0, 10)}</span>
                </div>
                <Link href={path} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-shield-700 hover:text-shield-800">
                  View trust report
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
