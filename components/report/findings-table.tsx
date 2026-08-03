"use client"

import { useState, useMemo } from 'react'
import type { Finding, Severity } from '@/lib/validator/types'

interface FindingsTableProps {
  findings: Finding[]
}

type SortKey = 'severity' | 'category' | 'title'

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
  { label: 'All', value: 'all' },
  { label: 'Critical', value: 'critical' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
  { label: 'Info', value: 'info' },
]

const PAGE_SIZE = 100

export default function FindingsTable({ findings }: FindingsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('severity')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterSeverity, setFilterSeverity] = useState<Severity | 'all'>('all')
  const [expandedRow, setExpandedRow] = useState<number | null>(null)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filtered = useMemo(() => {
    let list = findings
    if (filterSeverity !== 'all') {
      list = list.filter((f) => f.severity === filterSeverity)
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
  }, [findings, sortKey, sortAsc, filterSeverity])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  function sortArrow(key: SortKey) {
    if (sortKey !== key) return ''
    return sortAsc ? ' ▲' : ' ▼'
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 border-b border-outline px-4 pb-3 pt-3">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilterSeverity(opt.value)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filterSeverity === opt.value
                ? 'bg-on-surface text-white'
                : 'bg-surface-secondary text-on-surface-secondary hover:bg-outline'
            }`}
          >
            {opt.label}
          </button>
        ))}
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
            {filtered.slice(0, visibleCount).map((finding, idx) => {
              const isExpanded = expandedRow === idx
              return (
                <tr
                  key={finding.id}
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
                      onClick={() => setExpandedRow(isExpanded ? null : idx)}
                      aria-expanded={isExpanded}
                      className="text-left font-medium text-on-surface hover:text-shield-600 transition-colors"
                    >
                      {finding.title}
                    </button>
                    {isExpanded && (
                      <div className="mt-2 rounded-md bg-surface-secondary p-3">
                        <div className="mb-1 text-xs font-medium text-on-surface-secondary">Snippet</div>
                        <pre className="overflow-auto whitespace-pre-wrap text-xs text-on-surface">
                          {finding.snippet}
                        </pre>
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
