"use client"

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { getAllValidations, deleteValidation, clearHistory } from '@/lib/state'
import type { ValidationResult } from '@/lib/validator/types'

const PAGE_SIZE = 20

const sourceIcons: Record<string, string> = {
  upload: 'cloud_upload',
  paste: 'content_paste',
  github: 'code',
  url: 'link',
}

const riskBadgeColor: Record<string, string> = {
  safe: 'bg-shield-100 text-shield-800',
  low: 'bg-threat-low/10 text-threat-low',
  medium: 'bg-threat-medium/10 text-threat-medium',
  high: 'bg-threat-high/10 text-threat-high',
  critical: 'bg-threat-critical/10 text-threat-critical',
}

type SortMethod = 'newest' | 'oldest' | 'highest' | 'lowest' | 'mostFindings'

export default function HistoryPage() {
  const router = useRouter()
  const [validations, setValidations] = useState<ValidationResult[]>(() =>
    getAllValidations()
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMethod, setSortMethod] = useState<SortMethod>('newest')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const filteredAndSorted = useMemo(() => {
    const filtered = searchQuery.trim()
      ? validations.filter((v) =>
          v.skillName.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : [...validations]

    switch (sortMethod) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        break
      case 'highest':
        filtered.sort((a, b) => b.overallScore - a.overallScore)
        break
      case 'lowest':
        filtered.sort((a, b) => a.overallScore - b.overallScore)
        break
      case 'mostFindings':
        filtered.sort((a, b) => b.findings.length - a.findings.length)
        break
      default:
        filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    }

    return filtered
  }, [validations, searchQuery, sortMethod])

  const visibleValidations = filteredAndSorted.slice(0, visibleCount)
  const hasMore = visibleCount < filteredAndSorted.length

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    deleteValidation(id)
    setValidations((prev) => prev.filter((v) => v.id !== id))
  }

  async function handleShare(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    const url = `${window.location.origin}/validate/${id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // clipboard not available
    }
  }

  function handleClear() {
    if (confirm('Clear all validation history?')) {
      clearHistory()
      setValidations([])
    }
  }

  function handleLoadMore() {
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }

  const sourceLabel = (v: ValidationResult) => {
    if (!v.source) return null
    const icon = sourceIcons[v.source.type] || 'help'
    return (
      <span className="material-symbols-outlined ml-1.5 inline-block align-middle text-sm text-on-surface-secondary/50" title={v.source.type}>
        {icon}
      </span>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">History</h1>
          <p className="text-sm text-on-surface-secondary">
            {validations.length} validation{validations.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        {validations.length > 0 && (
          <button
            onClick={handleClear}
            className="rounded-lg border border-error/20 bg-error-container px-4 py-2 text-sm font-semibold text-error hover:bg-error-container/80 transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-shield-200/30 bg-shield-50/50 px-4 py-3 text-sm text-shield-700">
        <span className="material-symbols-outlined mr-2 inline-block align-middle text-base">info</span>
        Scan results are cached locally in this browser. Server-side copies remain available by report ID until retention expiry.
      </div>

      {validations.length > 0 && (
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base text-on-surface-secondary/50">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setVisibleCount(PAGE_SIZE) }}
              placeholder="Search skills..."
              className="w-full rounded-xl border border-outline bg-surface-container py-2.5 pl-9 pr-4 text-sm text-on-surface placeholder-on-surface-secondary/60 focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-on-surface-secondary">Sort by</label>
            <select
              value={sortMethod}
              onChange={(e) => { setSortMethod(e.target.value as SortMethod); setVisibleCount(PAGE_SIZE) }}
              className="rounded-xl border border-outline bg-surface-container px-3 py-2.5 text-sm text-on-surface focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500 transition-colors"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="highest">Highest Score</option>
              <option value="lowest">Lowest Score</option>
              <option value="mostFindings">Most Findings</option>
            </select>
          </div>
        </div>
      )}

      {validations.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <span className="material-symbols-outlined mb-3 inline-block text-5xl text-on-surface-secondary/40">
            history
          </span>
          <h2 className="text-lg font-semibold text-on-surface mb-1">No history yet</h2>
          <p className="text-sm text-on-surface-secondary mb-6">
            Validate your first skill to see results here
          </p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg bg-shield-600 px-5 py-2 text-sm font-semibold text-white hover:bg-shield-700 transition-colors"
          >
            Validate a Skill
          </button>
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined mb-2 inline-block text-3xl text-on-surface-secondary/40">search_off</span>
          <p className="text-sm text-on-surface-secondary">No skills match &quot;{searchQuery}&quot;</p>
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="divide-y divide-outline">
            {visibleValidations.map((v) => (
              <button
                key={v.id}
                onClick={() => router.push(`/validate/${v.id}`)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-secondary"
              >
                <div className="flex-shrink-0 text-center w-14">
                  <div
                    className={`text-xl font-bold ${
                      v.overallScore >= 70
                        ? 'text-shield-600'
                        : v.overallScore >= 50
                        ? 'text-yellow-600'
                        : v.overallScore >= 30
                        ? 'text-orange-600'
                        : 'text-red-600'
                    }`}
                  >
                    {v.overallScore}
                  </div>
                  <div className="text-[10px] font-medium uppercase text-on-surface-secondary/60">Score</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-on-surface truncate">{v.skillName}</div>
                  <div className="flex items-center text-xs text-on-surface-secondary">
                    <span>{new Date(v.timestamp).toLocaleString()}</span>
                    <span className="mx-1.5">&middot;</span>
                    <span>{v.findings.length} finding{v.findings.length !== 1 ? 's' : ''}</span>
                    {sourceLabel(v)}
                  </div>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${
                    riskBadgeColor[v.riskLevel]
                  }`}
                >
                  {v.riskLevel}
                </span>
                <button
                  onClick={(e) => handleShare(e, v.id)}
                  className="flex-shrink-0 rounded-lg p-2 text-on-surface-secondary/50 hover:text-shield-600 hover:bg-shield-50 transition-colors"
                  title="Copy validation URL"
                >
                  <span className="material-symbols-outlined text-lg">share</span>
                </button>
                <button
                  onClick={(e) => handleDelete(e, v.id)}
                  className="flex-shrink-0 rounded-lg p-2 text-on-surface-secondary/50 hover:text-error hover:bg-error/10 transition-colors"
                  title="Delete entry"
                >
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              </button>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center px-5 py-4">
              <button
                onClick={handleLoadMore}
                className="rounded-xl border border-outline bg-surface-container px-6 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-secondary transition-colors"
              >
                Load More ({filteredAndSorted.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
