"use client"

import { FormEvent, useState } from 'react'

type GitHubSearchResult = {
  owner: string
  repo: string
  fullName: string
  url: string
  description: string
  stars: number
  updatedAt: string | null
  defaultBranch: string | null
}

interface GitHubSearchProps {
  loading?: boolean
  onSelect: (target: { owner: string; repo: string; path: string; url: string; branch?: string }) => void
}

export default function GitHubSearch({ loading = false, onSelect }: GitHubSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GitHubSearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  async function search(event: FormEvent) {
    event.preventDefault()
    const term = query.trim()
    if (term.length < 2) {
      setError('Enter at least 2 characters to search GitHub.')
      return
    }

    setSearching(true)
    setError('')
    setHasSearched(true)
    try {
      const response = await fetch(`/api/github/search?q=${encodeURIComponent(term)}`)
      const data = await response.json() as { results?: GitHubSearchResult[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'GitHub search failed')
      setResults(data.results || [])
    } catch (searchError) {
      setResults([])
      setError(searchError instanceof Error ? searchError.message : 'GitHub search failed')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-on-surface">Search GitHub skill repositories</h2>
        <p className="mt-1 text-sm text-on-surface-secondary">Find a public repository, then run the same repository audit and skill scan used for pasted URLs.</p>
      </div>
      <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="github-skill-search">Search GitHub repositories</label>
        <input
          id="github-skill-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try “agent skills”, “PDF skill”, or “security”"
          className="min-w-0 flex-1 rounded-lg border border-outline bg-surface-container px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
        />
        <button type="submit" disabled={searching} className="rounded-lg border border-shield-600 px-5 py-2.5 text-sm font-semibold text-shield-700 hover:bg-shield-50 disabled:cursor-not-allowed disabled:opacity-50">
          {searching ? 'Searching...' : 'Search GitHub'}
        </button>
      </form>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      {hasSearched && !searching && !error && results.length === 0 && <p className="text-sm text-on-surface-secondary">No repositories matched. Try a broader skill or capability term.</p>}
      {results.length > 0 && (
        <ul className="divide-y divide-outline overflow-hidden rounded-xl border border-outline">
          {results.map((result) => (
            <li key={result.fullName} className="flex flex-col gap-3 bg-surface-container/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <a href={result.url} target="_blank" rel="noreferrer" className="font-semibold text-on-surface hover:text-shield-700">{result.fullName}</a>
                <p className="mt-1 line-clamp-2 text-sm text-on-surface-secondary">{result.description}</p>
                <p className="mt-2 text-xs text-on-surface-secondary">★ {result.stars.toLocaleString('en-US')}{result.defaultBranch ? ` · ${result.defaultBranch}` : ''}</p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => onSelect({ owner: result.owner, repo: result.repo, path: '', url: result.url, branch: result.defaultBranch || undefined })}
                className="shrink-0 rounded-lg bg-shield-600 px-4 py-2 text-sm font-semibold text-white hover:bg-shield-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Scan repository
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
