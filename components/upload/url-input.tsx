"use client"

import { useState } from 'react'

interface UrlInputProps {
  onParse: (data: { owner: string; repo: string; path: string; url: string; branch?: string; sha?: string }) => void
}

export default function UrlInput({ onParse }: UrlInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [parsed, setParsed] = useState(false)
  const [branch, setBranch] = useState('')
  const [sha, setSha] = useState('')
  const [focused, setFocused] = useState(false)

  function parseUrl(input: string) {
    setError('')
    const trimmed = input.trim()

    const githubPatterns = [
      /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)\/(.+)$/,
      /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/tree\/([^\/]+)$/,
      /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/,
      /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)$/,
      /^https?:\/\/(?:www\.)?github\.com\/([^\/]+)\/([^\/]+)$/,
    ]

    const skillsShPattern = /^https?:\/\/(?:www\.)?skills\.sh\/([^\/]+)\/([^\/]+)\/([^\/]+)$/

    const skillsMatch = trimmed.match(skillsShPattern)
    if (skillsMatch) {
      const owner = skillsMatch[1]
      const repo = skillsMatch[2]
      const skill = skillsMatch[3]
      setParsed(true)
      onParse({ owner, repo, path: skill, url: trimmed, branch: branch || undefined, sha: sha || undefined })
      return
    }

    for (const pattern of githubPatterns) {
      const match = trimmed.match(pattern)
      if (match) {
        const owner = match[1]
        const repo = match[2]
        const extractedBranch = match[3] || undefined
        const path = match.slice(4).join('/') || ''

        setParsed(true)
        if (!branch && extractedBranch) setBranch(extractedBranch)

        onParse({ owner, repo, path, url: trimmed, branch: branch || extractedBranch, sha: sha || undefined })
        return
      }
    }

    setError('Invalid URL. Expected: GitHub URL or skills.sh URL (e.g. https://skills.sh/owner/repo/skill)')
    setParsed(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
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
            onChange={(e) => {
              setUrl(e.target.value)
              setError('')
            }}
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
          disabled={!url.trim()}
          className="rounded-lg bg-shield-600 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_28px_rgba(34,197,94,0.18)] hover:bg-shield-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
        >
          Parse
        </button>
      </div>
      {parsed && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="Branch (optional)"
            aria-label="Branch name"
            className="flex-1 rounded-lg border border-outline bg-surface-container px-3 py-1.5 text-xs text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
          />
          <input
            type="text"
            value={sha}
            onChange={(e) => setSha(e.target.value)}
            placeholder="Commit SHA (optional)"
            aria-label="Commit SHA"
            className="flex-1 rounded-lg border border-outline bg-surface-container px-3 py-1.5 text-xs text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
          />
        </div>
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
