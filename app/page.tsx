"use client"

import Image from 'next/image'
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Dropzone from '@/components/upload/dropzone'
import UrlInput from '@/components/upload/url-input'
import { saveValidation } from '@/lib/state'
import { useToast } from '@/components/ui/toast'
import type { RepositoryMeta, SkillInput } from '@/lib/validator/types'
import type { RepositoryAudit } from '@/lib/github/repository-audit'

type Tab = 'upload' | 'url' | 'paste'

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('url')
  const [loading, setLoading] = useState(false)
  const [motionReady, setMotionReady] = useState(false)
  const [pasteContent, setPasteContent] = useState('')
  const scanPath =
    tab === 'url'
      ? 'github.com/owner/repo'
      : tab === 'upload'
      ? 'local://skill-package'
      : 'editor://SKILL.md'
  const scanSteps = loading
    ? [
        ['Read SKILL.md', 'Running'],
        ['Trace install scripts', 'Scanning'],
        ['Score runtime risk', 'Queued'],
      ]
    : [
        ['Read SKILL.md', 'Ready'],
        ['Trace install scripts', tab === 'url' ? 'Armed' : 'Awaiting'],
        ['Score runtime risk', 'Ready'],
      ]

  useEffect(() => {
    let frameId = 0
    frameId = window.requestAnimationFrame(() => {
      setMotionReady(true)
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [])

  const readApiError = useCallback(async (res: Response, fallback: string) => {
    try {
      const data = await res.json() as { error?: string; details?: string }
      if (typeof data.error === 'string' && data.error.length > 0) {
        return typeof data.details === 'string' && data.details.length > 0
          ? `${data.error}: ${data.details}`
          : data.error
      }
    } catch {
      // Ignore parse failures and use the fallback message below.
    }

    return fallback
  }, [])

  const validate = useCallback(async (input: SkillInput) => {
    setLoading(true)
    try {
      const res = await fetch('/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Validation failed'))
      const result = await res.json()
      saveValidation(result)
      router.push(`/validate/${result.id}`)
    } catch (err) {
      toast('Validation failed: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }, [readApiError, router, toast])

  const handleDropFiles = useCallback(async (files: { name: string; content: string }[]) => {
    const skillFiles = files.map(f => ({ path: f.name, content: f.content }))
    const skillInput: SkillInput = { files: skillFiles }
    await validate(skillInput)
  }, [validate])

  const handleUrlParse = useCallback(async (data: { owner: string; repo: string; path: string; url: string }) => {
    setLoading(true)
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: data.owner, repo: data.repo, path: data.path }),
      })
      if (!res.ok) {
        throw new Error(await readApiError(res, 'Failed to fetch repository'))
      }
      const result = await res.json() as {
        files: SkillInput['files']
        owner: string
        repo: string
        path: string
        branch?: string
        sha?: string
        repositoryAudit?: RepositoryAudit
        repositoryMeta?: RepositoryMeta
        warning?: string
      }
      if (typeof result.warning === 'string' && result.warning.length > 0) {
        toast(result.warning, 'info')
      }
      await validate({
        files: result.files,
        source: {
          type: 'github',
          url: data.url,
          owner: result.owner,
          repo: result.repo,
          path: result.path,
          branch: result.branch,
          sha: result.sha,
          repositoryAudit: result.repositoryAudit,
          repositoryMeta: result.repositoryMeta,
        },
      })
    } catch (err) {
      toast('Failed to fetch from GitHub: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }, [readApiError, toast, validate])

  const handlePasteValidate = useCallback(async () => {
    if (!pasteContent.trim()) return
    await validate({ files: [{ path: 'SKILL.md', content: pasteContent }], source: { type: 'paste' } })
  }, [pasteContent, validate])

  return (
    <div
      className="home-hero-shell mx-auto max-w-6xl px-4 py-16 bg-surface"
      data-motion-ready={motionReady ? 'true' : 'false'}
    >
      <div className="home-hero-intro mb-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
        <div className="home-hero-content">
          <div className="mb-6">
            <div className="inline-flex rounded-2xl border border-white/10 bg-black/18 p-3 shadow-[0_18px_48px_rgba(15,23,42,0.24)] backdrop-blur-sm">
              <Image
                src="/support-engine-logo.png"
                alt="Support Engine"
                width={900}
                height={500}
                priority
                className="h-auto w-[220px] object-contain sm:w-[250px] lg:w-[280px]"
              />
            </div>
          </div>
          <div className="home-hero-badge mb-3 inline-flex items-center gap-2 rounded-full border border-shield-200/40 bg-shield-50/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-shield-700">
            <span className="material-symbols-outlined text-sm">shield</span>
            Pre-install skill security
          </div>
          <h1 className="home-hero-title text-4xl font-bold text-on-surface sm:text-5xl">
            Validate agent skills before they touch your environment
          </h1>
          <p className="home-hero-copy mt-2 text-lg text-on-surface-secondary">
            Upload a skill package, audit a GitHub repository, or paste raw `SKILL.md` content to review security, compatibility, and install risk in one report.
          </p>
        </div>

        <div className="home-scan-stage" aria-hidden="true">
          <div className="home-scan-topbar">
            <div className="home-scan-window-dots">
              <span />
              <span />
              <span />
            </div>
            <span className="home-scan-path">{scanPath}</span>
            <span className="home-scan-live">{loading ? 'SCAN' : 'LIVE'}</span>
          </div>

          <div className="home-scan-viewport">
            <div className="home-scan-grid" />
            <div className="home-scan-beam" />
            <div className="home-scan-signal home-scan-signal-a" />
            <div className="home-scan-signal home-scan-signal-b" />
            <div className="home-scan-lock">
              <span className="material-symbols-outlined">verified_user</span>
            </div>
          </div>

          <div className="home-scan-steps">
            {scanSteps.map(([label, status]) => (
              <div key={label} className="home-scan-step">
                <span className="home-scan-step-dot" />
                <span>{label}</span>
                <strong>{status}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <section id="upload" className="home-panel scroll-mt-20 mb-12">
        <div className="glass-card">
          <div className="home-tabs flex border-b border-outline">
            {([['url', 'GitHub Repo'], ['upload', 'Upload Files'], ['paste', 'Paste SKILL.md']] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  tab === key
                    ? 'border-b-2 border-shield-500 text-shield-700 bg-shield-50'
                    : 'text-on-surface-secondary hover:text-on-surface hover:bg-surface-secondary'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === 'upload' && <Dropzone onFiles={handleDropFiles} />}

          {tab === 'url' && <UrlInput onParse={handleUrlParse} />}

            {tab === 'paste' && (
              <div className="space-y-4">
                <textarea
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder={`---\nname: my-skill\ndescription: What your skill does and when to use it.\n---\n\n# Your Skill Instructions\n\nStart typing your SKILL.md content here...`}
                  rows={16}
                  className="w-full rounded-lg border border-outline bg-surface-container p-4 text-sm font-mono text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handlePasteValidate}
                    disabled={!pasteContent.trim() || loading}
                    className="rounded-lg bg-shield-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-shield-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Validating...' : 'Validate'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-3 border-t border-outline pt-4">
              <label className="text-xs font-medium text-on-surface-secondary">Policy Mode</label>
              <select
                className="rounded-lg border border-outline bg-surface-container px-3 py-1.5 text-sm text-on-surface focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500 transition-colors"
              >
                <option value="default">Default</option>
                <option value="strict">Strict</option>
                <option value="enterprise">Enterprise</option>
                <option value="custom">Custom</option>
              </select>
            </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-on-surface-secondary">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-shield-200 border-t-shield-600" />
                Running validation and repository audit...
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="home-stat-grid mb-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="home-stat-card home-stat-card-1 glass-card p-6">
          <span className="material-symbols-outlined mb-3 inline-block text-3xl text-shield-500">insights</span>
          <div className="text-3xl font-bold text-shield-600">130K+</div>
          <div className="mt-1 text-sm text-on-surface-secondary">skill packages reviewed</div>
        </div>
        <div className="home-stat-card home-stat-card-2 glass-card p-6">
          <span className="material-symbols-outlined mb-3 inline-block text-3xl text-shield-500">warning</span>
          <div className="text-3xl font-bold text-shield-600">12</div>
          <div className="mt-1 text-sm text-on-surface-secondary">threat categories tracked</div>
        </div>
        <div className="home-stat-card home-stat-card-3 glass-card p-6">
          <span className="material-symbols-outlined mb-3 inline-block text-3xl text-shield-500">extension</span>
          <div className="text-3xl font-bold text-shield-600">22+</div>
          <div className="mt-1 text-sm text-on-surface-secondary">agent ecosystems recognized</div>
        </div>
      </div>

      <section className="home-feature-shell">
        <div className="glass-card p-8">
          <div className="home-feature-grid grid grid-cols-1 gap-8 sm:grid-cols-3">
            <div className="home-feature-card text-center">
              <span className="material-symbols-outlined mb-2 inline-block text-4xl text-shield-500">cloud_upload</span>
              <h3 className="mt-2 font-semibold text-on-surface">Upload</h3>
              <p className="mt-1 text-sm text-on-surface-secondary">
                Drop a local skill package or scan the files directly
              </p>
            </div>
            <div className="home-feature-card text-center">
              <span className="material-symbols-outlined mb-2 inline-block text-4xl text-shield-500">travel_explore</span>
              <h3 className="mt-2 font-semibold text-on-surface">Audit</h3>
              <p className="mt-1 text-sm text-on-surface-secondary">
                Review GitHub install scripts, workflows, registries, and runtime risk
              </p>
            </div>
            <div className="home-feature-card text-center">
              <span className="material-symbols-outlined mb-2 inline-block text-4xl text-shield-500">description</span>
              <h3 className="mt-2 font-semibold text-on-surface">Report</h3>
              <p className="mt-1 text-sm text-on-surface-secondary">
                Inspect score, findings, repo audit evidence, and export artifacts
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
