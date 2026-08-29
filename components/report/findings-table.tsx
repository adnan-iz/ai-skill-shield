"use client"

import { useEffect, useMemo, useState } from 'react'
import type { Finding, Severity } from '@/lib/validator/types'

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
  critical: 'bg-threat-critical/10 text-threat-critical border-threat-critical/20',
  high: 'bg-threat-high/10 text-threat-high border-threat-high/20',
  medium: 'bg-threat-medium/10 text-threat-medium border-threat-medium/20',
  low: 'bg-threat-low/10 text-threat-low border-threat-low/20',
  info: 'bg-threat-info/10 text-threat-info border-threat-info/20',
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
      <div className="flex flex-wrap items-center gap-2 border-b border-outline px-4 pb-3 pt-3">
        <button
          type="button"
          onClick={() => changeSeverity('priority')}
          aria-pressed={filterSeverity === 'priority'}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500/70 ${
            filterSeverity === 'priority' ? 'bg-shield-600 text-white shadow-sm' : 'bg-surface-secondary text-on-surface-secondary hover:bg-outline'
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
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shield-500/70 ${
              filterSeverity === opt.value
                ? 'bg-shield-600 text-white shadow-sm'
                : 'bg-surface-secondary text-on-surface-secondary hover:bg-outline'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <select
          aria-label="Filter findings by category"
          value={filterCategory}
          onChange={(event) => changeCategory(event.target.value)}
          className="rounded-full border border-outline bg-surface-container px-3 py-1 text-xs text-on-surface"
        >
          <option value="all">All categories</option>
          {categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        <input
          type="search"
          aria-label="Search findings"
          value={query}
          onChange={(event) => changeQuery(event.target.value)}
          placeholder="Search titles, files, or evidence"
          className="min-w-40 flex-1 rounded-full border border-outline bg-surface-container px-3 py-1 text-xs text-on-surface placeholder-on-surface-secondary"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline text-left text-xs font-semibold uppercase text-on-surface-secondary">
              <th
                tabIndex={0}
                className="cursor-pointer px-4 py-3 hover:text-on-surface"
                onClick={() => toggleSort('severity')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('severity'); } }}
              >
                Severity{sortArrow('severity')}
              </th>
              <th
                tabIndex={0}
                className="cursor-pointer px-4 py-3 hover:text-on-surface"
                onClick={() => toggleSort('category')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('category'); } }}
              >
                Category{sortArrow('category')}
              </th>
              <th
                tabIndex={0}
                className="cursor-pointer px-4 py-3 hover:text-on-surface"
                onClick={() => toggleSort('title')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('title'); } }}
              >
                Title{sortArrow('title')}
              </th>
              <th className="px-4 py-3">File:Line</th>
              <th className="px-4 py-3">Recommendation</th>
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
                  className={`border-b border-outline transition-colors ${
                    isExpanded ? 'bg-surface-secondary' : 'hover:bg-surface-secondary'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        severityColors[finding.severity]
                      }`}
                    >
                      {finding.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-on-surface-secondary">{finding.category}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : finding.id)}
                      aria-expanded={isExpanded}
                      className="text-left font-medium text-on-surface hover:text-shield-600 transition-colors"
                    >
                      {finding.title}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 space-y-3 rounded-md bg-surface-secondary p-3 text-xs">
                        <div>
                          <div className="mb-1 font-medium text-on-surface-secondary">Why it matters</div>
                          <p className="text-on-surface">{finding.message}</p>
                        </div>
                        <div>
                          <div className="mb-1 font-medium text-on-surface-secondary">Evidence</div>
                          <pre className="overflow-auto whitespace-pre-wrap text-on-surface">
                            {finding.snippet || 'No source snippet was captured for this file-level finding.'}
                          </pre>
                        </div>
                        {finding.recommendation && (
                          <div>
                            <div className="mb-1 font-medium text-on-surface-secondary">Recommended action</div>
                            <p className="text-on-surface">{finding.recommendation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-secondary">
                    {finding.filePath || 'SKILL.md'}{finding.lineNumber && finding.lineNumber > 0 ? `:${finding.lineNumber}` : ' · file-level'}
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-secondary">{finding.recommendation}</td>
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
