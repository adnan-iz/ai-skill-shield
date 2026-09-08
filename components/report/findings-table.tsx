"use client"

import { useEffect, useMemo, useState } from 'react'
import type { Finding, Severity } from '@/lib/validator/types'

function ChevronRightIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

interface FindingsTableProps {
  findings: Finding[]
}

type SortKey = 'severity' | 'category' | 'title'
type SeverityFilter = Severity | 'all' | 'priority'

const severityOrder: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

const severityColors: Record<Severity, string> = {
  critical: 'bg-error-container/20 text-error border-error/40',
  high: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
  low: 'bg-primary/15 text-primary border-primary/30',
  info: 'bg-secondary-container/25 text-secondary border-secondary/30',
}

const filterOptions: { label: string; value: Severity | 'all' }[] = [
  { label: 'All severities', value: 'all' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'Info', value: 'info' },
]

const PAGE_SIZE = 50

export default function FindingsTable({ findings }: FindingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('severity')
  const [sortAsc, setSortAsc] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState<SeverityFilter>('priority')
  const [filterCategory, setFilterCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    let list = findings
    if (filterSeverity === 'priority') {
      list = list.filter((f) => f.severity === 'critical' || f.severity === 'high' || f.severity === 'medium')
    } else if (filterSeverity !== 'all') {
      list = list.filter((f) => f.severity === filterSeverity)
    }
    if (filterCategory !== 'all') {
      list = list.filter((f) => f.category === filterCategory)
    }
    const normalizedQuery = query.trim().toLocaleLowerCase()
    if (normalizedQuery) {
      list = list.filter((f) => [f.title, f.category, f.filePath, f.message, f.recommendation].filter(Boolean).join(' ').toLocaleLowerCase().includes(normalizedQuery))
    }
    return [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'severity') {
        cmp = severityOrder[a.severity] - severityOrder[b.severity]
      } else if (sortKey === 'category') {
        cmp = a.category.localeCompare(b.category)
      } else if (sortKey === 'title') {
        cmp = a.title.localeCompare(b.title)
      }
      return sortAsc ? cmp : -cmp
    })
  }, [findings, sortKey, sortAsc, filterSeverity, filterCategory, query])

  const categories = useMemo(() => [...new Set(findings.map((finding) => finding.category))].sort(), [findings])

  useEffect(() => {
    function revealAnchoredFinding() {
      const hash = window.location.hash
      if (!hash.startsWith('#finding-')) return
      const findingId = decodeURIComponent(hash.slice('#finding-'.length))
      const finding = findings.find((candidate) => candidate.id === findingId)
      if (!finding) return

      setFilterSeverity('priority')
      setFilterCategory('all')
      setQuery('')
      setExpandedRow(finding.id)
    }

    revealAnchoredFinding()
    window.addEventListener('hashchange', revealAnchoredFinding)
    return () => window.removeEventListener('hashchange', revealAnchoredFinding)
  }, [findings])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function changeSeverity(severity: SeverityFilter) {
    setFilterSeverity(severity)
    setVisibleCount(PAGE_SIZE)
  }

  function changeCategory(category: string) {
    setFilterCategory(category)
    setVisibleCount(PAGE_SIZE)
  }

  function changeQuery(nextQuery: string) {
    setQuery(nextQuery)
    setVisibleCount(PAGE_SIZE)
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return ''
    return sortAsc ? ' ▲' : ' ▼'
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/40 bg-surface-container-high/30 px-4 py-3">
        <button
          type="button"
          onClick={() => changeSeverity('priority')}
          aria-pressed={filterSeverity === 'priority'}
          className={`rounded font-mono px-2.5 py-1 text-xs uppercase tracking-wider transition-all focus-visible:outline-none ${
            filterSeverity === 'priority'
              ? 'border border-primary/50 bg-primary/20 text-primary font-bold shadow-[0_0_10px_-2px_rgba(75,226,119,0.3)]'
              : 'border border-outline-variant/50 bg-surface-container-low text-on-surface-secondary hover:text-on-surface hover:border-primary/30'
          }`}
        >
          Priority findings
        </button>
        {filterOptions.map((opt) => (
          <button
            type="button"
            key={opt.value}
            onClick={() => changeSeverity(opt.value)}
            aria-pressed={filterSeverity === opt.value}
            className={`rounded font-mono px-2.5 py-1 text-xs uppercase tracking-wider transition-all focus-visible:outline-none ${
              filterSeverity === opt.value
                ? 'border border-primary/50 bg-primary/20 text-primary font-bold shadow-[0_0_10px_-2px_rgba(75,226,119,0.3)]'
                : 'border border-outline-variant/50 bg-surface-container-low text-on-surface-secondary hover:text-on-surface hover:border-primary/30'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <select
          aria-label="Filter findings by category"
          value={filterCategory}
          onChange={(event) => changeCategory(event.target.value)}
          className="rounded border border-outline-variant/50 bg-surface-container-low px-3 py-1 font-mono text-xs text-on-surface focus:outline-none focus:border-primary/50"
        >
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <input
          type="search"
          aria-label="Search findings"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Search titles, files, or evidence..."
          className="min-w-44 flex-1 rounded border border-outline-variant/50 bg-surface-container-lowest px-3 py-1 font-mono text-xs text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary/50"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant/60 text-left text-[11px] font-mono font-semibold uppercase tracking-wider text-on-surface-secondary bg-surface-container-high/20">
              <th
                tabIndex={0}
                className="cursor-pointer px-4 py-2.5 hover:text-primary transition-colors"
                onClick={() => toggleSort('severity')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('severity'); } }}
              >
                Severity{sortArrow('severity')}
              </th>
              <th
                tabIndex={0}
                className="cursor-pointer px-4 py-2.5 hover:text-primary transition-colors"
                onClick={() => toggleSort('category')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('category'); } }}
              >
                Category{sortArrow('category')}
              </th>
              <th
                tabIndex={0}
                className="cursor-pointer px-4 py-2.5 hover:text-primary transition-colors"
                onClick={() => toggleSort('title')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('title'); } }}
              >
                Title{sortArrow('title')}
              </th>
              <th className="px-4 py-2.5">File:Line</th>
              <th className="px-4 py-2.5">Recommendation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visibleCount).map((finding) => {
              const isExpanded = expandedRow === finding.id
              const findingAnchorId = `finding-${encodeURIComponent(finding.id)}`
              return (
                <tr
                  key={finding.id}
                  id={findingAnchorId}
                  className={`border-b border-outline-variant/30 transition-colors ${
                    isExpanded ? 'bg-surface-container-high/50' : 'hover:bg-surface-container-high/30'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        severityColors[finding.severity]
                      }`}
                    >
                      {finding.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-secondary">{finding.category}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : finding.id)}
                      aria-expanded={isExpanded}
                      className="text-left font-medium text-on-surface hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      {isExpanded ? (
                        <ChevronDownIcon className="h-3.5 w-3.5 text-on-surface-secondary shrink-0" />
                      ) : (
                        <ChevronRightIcon className="h-3.5 w-3.5 text-on-surface-secondary shrink-0" />
                      )}
                      <span>{finding.title}</span>
                    </button>
                    {isExpanded && (
                      <div className="mt-3 space-y-2.5 rounded-lg border border-outline-variant/60 bg-surface-container-lowest p-3.5 text-xs shadow-inner">
                        <div>
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-on-surface-secondary">VULNERABILITY CONTEXT</div>
                          <p className="text-on-surface font-sans text-xs">{finding.message}</p>
                        </div>
                        <div>
                          <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-primary">AUDIT EVIDENCE</div>
                          <pre className="overflow-auto whitespace-pre-wrap rounded border border-outline-variant/40 bg-surface-container-low p-2.5 font-mono text-xs text-on-surface">
                            {finding.snippet || 'No source snippet was captured for this file-level finding.'}
                          </pre>
                        </div>
                        {finding.recommendation && (
                          <div>
                            <div className="mb-1 font-mono text-[10px] uppercase tracking-wider text-secondary">RECOMMENDED REMEDIATION</div>
                            <p className="text-on-surface font-sans text-xs">{finding.recommendation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-secondary">
                    {finding.filePath || 'SKILL.md'}{finding.lineNumber && finding.lineNumber > 0 ? `:${finding.lineNumber}` : ' · file-level'}
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-secondary leading-relaxed">{finding.recommendation}</td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-on-surface-secondary">
                  No findings match the current filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {visibleCount < filtered.length && (
        <div className="flex justify-center border-t border-outline p-4">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className="rounded-lg border border-outline bg-surface-container px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-secondary"
          >
            Show 100 more ({filtered.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  )
}
