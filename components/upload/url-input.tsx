"use client"

import { useState } from 'react'
import { parseRepositoryUrl } from '@/lib/github/url-parsing'

interface UrlInputProps {
  onParse: (data: { owner: string; repo: string; path: string; url: string; branch?: string; sha?: string }) => void
  resolutionHint?: string
  loading?: boolean
}

export default function UrlInput({ onParse, resolutionHint, loading = false }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState(false)
  const [branch, setBranch] = useState('')
  const [sha, setSha] = useState('')
  const [focused, setFocused] = useState(false)

  function parseUrl(input: string) {
    setError('')
    const trimmed = input.trim()
    const parsedUrl = parseRepositoryUrl(trimmed)

    if (!parsedUrl) {
      setError('Invalid URL. Expected a GitHub, raw GitHub, or skills.sh repository URL')
      setParsed(false)
      return
    }

    setParsed(true)

    if (!branch && parsedUrl.branch) {
      setBranch(parsedUrl.branch)
    }

    onParse({
      owner: parsedUrl.owner,
      repo: parsedUrl.repo,
      path: parsedUrl.path,
      url: parsedUrl.url,
      branch: branch || parsedUrl.branch,
      sha: sha || undefined,
    })
  }

  function handleUrlChange(nextUrl: string) {
    setUrl(nextUrl)
    setError('')
    if (parsed) {
      setParsed(false)
    }
  }

  function handleBranchChange(nextBranch: string) {
    setBranch(nextBranch)
    if (parsed) {
      setParsed(false)
    }
  }

  function handleShaChange(nextSha: string) {
    setSha(nextSha)
    if (parsed) {
      setParsed(false)
    }
  }

  function hintText() {
    const parsedUrl = parseRepositoryUrl(url)
    if (!parsedUrl) return null

    if (resolutionHint) return resolutionHint

    const branchLabel = parsedUrl.branch ? ` on ${parsedUrl.branch}` : ''
    const pathLabel = parsedUrl.path ? ` -> ${parsedUrl.path}` : ''

    return `Import target: ${parsedUrl.owner}/${parsedUrl.repo}${branchLabel}${pathLabel}`
  }

  const hint = hintText()

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !loading) {
      parseUrl(url)
    }
  }

  return (
    <div>
      <div className="home-url-glow flex gap-2 rounded-xl">
        <div
          className={`home-url-shell relative flex-1 ${!url && !focused ? 'home-url-shell-demo' : ''}`}
        >
          <input
            type="text"
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={focused || url ? "https://github.com/owner/repo or https://skills.sh/owner/repo/skill" : ""}
            aria-label="GitHub or skills.sh URL"
            className="home-url-input flex-1 rounded-lg border border-outline bg-surface-container px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none"
          />
          {!url && !focused && (
            <div aria-hidden="true" className="home-url-demo-text">
              https://github.com/lobehub/lobehub
            </div>
          )}
        </div>
        <button
          onClick={() => parseUrl(url)}
          disabled={!url.trim() || loading}
          className="rounded-lg bg-shield-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(34,197,94,0.18)] hover:bg-shield-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          {loading ? 'Scanning...' : 'Scan'}
        </button>
      </div>
      {parsed && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={branch}
            onChange={(e) => handleBranchChange(e.target.value)}
            placeholder="Branch (optional)"
            aria-label="Branch name"
            className="flex-1 rounded-lg border border-outline bg-surface-container px-3 py-1.5 text-xs text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
          />
          <input
            type="text"
            value={sha}
            onChange={(e) => handleShaChange(e.target.value)}
            placeholder="Commit SHA (optional)"
            aria-label="Commit SHA"
            className="flex-1 rounded-lg border border-outline bg-surface-container px-3 py-1.5 text-xs text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
          />
        </div>
      )}
      {hint && !error && (
        <p className="mt-2 text-xs text-on-surface-secondary">
          {hint}
        </p>
      )}
      <p className="mt-2 text-xs text-on-surface-secondary">
        Full GitHub imports now include a repository audit for install-time scripts, workflows, registries, and submodules before validation.
      </p>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-error">{error}</p>
      )}
    </div>
  )
}
