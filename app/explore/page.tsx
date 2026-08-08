import type { Metadata } from 'next'
import Link from 'next/link'
import { explorerItems, type ExplorerItem, type TrustBand } from '@/lib/explorer'
import { buildInstallDecision } from '@/lib/report/install-decision'
import { githubTrustPath } from '@/lib/trust'
import { getRecentPublicResults } from '@/lib/store'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Explore Verified Agent Skills',
  description: 'Search verified public agent skills by category, vendor, and trust score.',
  alternates: { canonical: '/explore' },
}

type SearchParams = {
  q?: string | string[]
  trust?: string | string[]
  category?: string | string[]
  vendor?: string | string[]
  sort?: string | string[]
  page?: string | string[]
}

const PAGE_SIZE = 12

function first(value?: string | string[]): string {
  return Array.isArray(value) ? value[0] || '' : value || ''
}

function countBy(items: ExplorerItem[], key: 'category' | 'vendor'): [string, number][] {
  const counts = new Map<string, number>()
  for (const item of items) counts.set(item[key], (counts.get(item[key]) || 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

function href(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, String(value))
  const suffix = query.toString()
  return suffix ? `/explore?${suffix}` : '/explore'
}

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const raw = await searchParams
  const q = first(raw.q).trim()
  const trust = first(raw.trust) as TrustBand | ''
  const category = first(raw.category)
  const vendor = first(raw.vendor)
  const sort = first(raw.sort) || 'newest'
  const requestedPage = Math.max(1, Number.parseInt(first(raw.page) || '1', 10) || 1)

  // ponytail: in-memory filtering is enough until the public corpus makes indexed columns measurably necessary.
  const allItems = explorerItems(await getRecentPublicResults(1_000))
  const categories = countBy(allItems, 'category')
  const vendors = countBy(allItems, 'vendor')
  const needle = q.toLowerCase()
  const filtered = allItems.filter((item) =>
    (!needle || item.searchable.includes(needle)) &&
    (!trust || item.trust === trust) &&
    (!category || item.category === category) &&
    (!vendor || item.vendor === vendor)
  )

  filtered.sort((a, b) => {
    if (sort === 'score') return b.result.overallScore - a.result.overallScore
    if (sort === 'stars') return (b.result.source?.repositoryMeta?.stars || 0) - (a.result.source?.repositoryMeta?.stars || 0)
    if (sort === 'name') return a.result.skillName.localeCompare(b.result.skillName)
    return Date.parse(b.result.timestamp) - Date.parse(a.result.timestamp)
  })

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const page = Math.min(requestedPage, pageCount)
  const items = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const base = { q, trust, category, vendor, sort: sort === 'newest' ? undefined : sort }
  const trustedCount = allItems.filter((item) => item.trust === 'trusted').length

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-shield-200 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,.2),transparent_35%),linear-gradient(135deg,#07140f,#10261d)] px-6 py-9 text-white sm:px-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-shield-300">Open trust index</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-5xl">Find agent skills worth trusting.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Every listing links to evidence from a public default-branch scan. Search the corpus, compare vendors, and inspect risks before installation.</p>
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Verified skills', allItems.length],
            ['Trusted', trustedCount],
            ['Categories', categories.length],
            ['Vendors', vendors.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <div className="text-2xl font-bold text-white">{Number(value).toLocaleString('en-US')}</div>
              <div className="text-xs text-slate-400">{label}</div>
            </div>
          ))}
        </div>
      </header>

      <form action="/explore" className="glass-card mb-6 grid gap-3 rounded-2xl p-4 lg:grid-cols-[minmax(14rem,1fr)_repeat(4,minmax(9rem,auto))_auto]" role="search">
        <label className="sr-only" htmlFor="skill-search">Search skills</label>
        <input id="skill-search" name="q" defaultValue={q} placeholder="Search skills, repos, or capabilities" className="min-w-0 rounded-xl border border-outline bg-surface-container px-4 py-3 text-sm text-on-surface focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500" />
        <select name="trust" defaultValue={trust} aria-label="Trust level" className="rounded-xl border border-outline bg-surface-container px-3 py-3 text-sm text-on-surface">
          <option value="">All trust levels</option><option value="trusted">Trusted 80+</option><option value="caution">Caution 40-79</option><option value="restricted">Restricted 0-39</option>
        </select>
        <select name="category" defaultValue={category} aria-label="Category" className="rounded-xl border border-outline bg-surface-container px-3 py-3 text-sm text-on-surface">
          <option value="">All categories</option>{categories.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
        </select>
        <select name="vendor" defaultValue={vendor} aria-label="Vendor" className="rounded-xl border border-outline bg-surface-container px-3 py-3 text-sm text-on-surface">
          <option value="">All vendors</option>{vendors.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
        </select>
        <select name="sort" defaultValue={sort} aria-label="Sort skills" className="rounded-xl border border-outline bg-surface-container px-3 py-3 text-sm text-on-surface">
          <option value="newest">Newest</option><option value="score">Highest score</option><option value="stars">Most stars</option><option value="name">Name</option>
        </select>
        <button className="rounded-xl bg-shield-600 px-5 py-3 text-sm font-semibold text-white hover:bg-shield-700" type="submit">Apply</button>
      </form>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-on-surface-secondary">
        <span>Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString('en-US')} skills</span>
        {(q || trust || category || vendor || sort !== 'newest') && <Link href="/explore" className="font-semibold text-shield-700 hover:text-shield-800">Clear filters</Link>}
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <h2 className="font-semibold text-on-surface">No matching public skills</h2>
          <p className="mt-2 text-sm text-on-surface-secondary">Try a broader search or clear the filters.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const decision = buildInstallDecision(item.result, null)
            const tone = item.trust === 'trusted' ? 'bg-shield-100 text-shield-800' : item.trust === 'caution' ? 'bg-yellow-100 text-yellow-900' : 'bg-red-100 text-red-900'
            return (
              <article key={`${item.owner}/${item.repo}/${item.path}`} className="glass-card flex min-w-0 flex-col rounded-2xl p-5 transition-transform hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0"><p className="truncate text-xs font-semibold uppercase tracking-wider text-shield-700">{item.vendor}</p><h2 className="mt-1 truncate text-lg font-bold text-on-surface">{item.result.skillName}</h2></div>
                  <div className="text-right"><div className="text-3xl font-bold text-on-surface">{item.result.overallScore}</div><div className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${tone}`}>{item.trust}</div></div>
                </div>
                <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-on-surface-secondary">{item.result.source?.repositoryMeta?.description || decision.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-surface-secondary px-2.5 py-1 text-on-surface-secondary">{item.category}</span><span className="rounded-full bg-surface-secondary px-2.5 py-1 text-on-surface-secondary">{item.result.findings.length} findings</span></div>
                <p className="mt-4 truncate font-mono text-xs text-on-surface-secondary">{item.owner}/{item.repo}/{item.path || 'SKILL.md'}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <Link href={githubTrustPath(item)} className="font-semibold text-shield-700 hover:text-shield-800">Inspect trust evidence</Link>
                  <Link href={`/validate/${encodeURIComponent(item.result.id)}#ai-review`} className="rounded-lg bg-secondary px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary/80">AI Review</Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Skill directory pagination" className="mt-8 flex items-center justify-center gap-2">
          {page > 1 && <Link href={href({ ...base, page: page - 1 })} className="rounded-lg border border-outline px-4 py-2 text-sm font-semibold text-on-surface">Previous</Link>}
          <span className="px-3 text-sm text-on-surface-secondary">Page {page} of {pageCount}</span>
          {page < pageCount && <Link href={href({ ...base, page: page + 1 })} className="rounded-lg border border-outline px-4 py-2 text-sm font-semibold text-on-surface">Next</Link>}
        </nav>
      )}
    </main>
  )
}
