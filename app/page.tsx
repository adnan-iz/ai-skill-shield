"use client"

import Link from 'next/link'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Dropzone from '@/components/upload/dropzone'
import GitHubSearch from '@/components/upload/github-search'
import UrlInput from '@/components/upload/url-input'
import { saveValidation } from '@/lib/state'
import { useToast } from '@/components/ui/toast'
import type { RepositoryMeta, SkillInput } from '@/lib/validator/types'
import type { RepositoryAudit } from '@/lib/github/repository-audit'
import { parseRepositoryUrl } from '@/lib/github/url-parsing'

type Tab = 'upload' | 'url' | 'search' | 'paste'

interface GitHubTarget {
  owner: string
  repo: string
  path: string
  url: string
  branch?: string
  sha?: string
}

const faqItems = [
  {
    question: 'What does AI Skill Shield check?',
    answer: 'AI Skill Shield reviews AI agent skill files for exposed secrets, destructive commands, shell-execution risk, external network access, permission concerns, compatibility, and unsafe install-time behavior.',
  },
  {
    question: 'How can I scan an AI agent skill?',
    answer: 'Paste a public GitHub repository URL, upload the skill files, or paste the SKILL.md content. AI Skill Shield returns a static score, highest finding severity, evidence, and an install recommendation.',
  },
  {
    question: 'Does AI Skill Shield support repository audits?',
    answer: 'Yes. GitHub imports can inspect install scripts, workflows, registries, submodules, and repository metadata in addition to the skill files.',
  },
  {
    question: 'Can AI Skill Shield be used in automated workflows?',
    answer: 'Yes. The AI Skill Shield API supports validation, repository auditing, policy checks, comparisons, and report exports for development and CI workflows.',
  },
]

const pageSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': 'https://ai-skill-shield.suppeng.com/#application',
      name: 'AI Skill Shield',
      url: 'https://ai-skill-shield.suppeng.com/',
      applicationCategory: 'SecurityApplication',
      operatingSystem: 'Web',
      isAccessibleForFree: true,
      description: 'Pre-install security validation and risk reporting for AI agent skills and GitHub repositories.',
      featureList: [
        'SKILL.md security validation',
        'GitHub repository auditing',
        'AI agent ecosystem compatibility checks',
        'Security policy validation',
        'SARIF, JSON, HTML, print-to-PDF, CSV, and Markdown reports',
      ],
      provider: { '@id': 'https://ai-skill-shield.suppeng.com/#organization' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: faqItems.map(({ question, answer }) => ({
        '@type': 'Question',
        name: question,
        acceptedAnswer: { '@type': 'Answer', text: answer },
      })),
    },
  ],
}

export default function HomePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('url')
  const [loading, setLoading] = useState(false)
  const [motionReady, setMotionReady] = useState(false)
  const [pasteContent, setPasteContent] = useState('')
  const [resolutionHint, setResolutionHint] = useState('')
  const rescanStarted = useRef(false)

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

  const validate = useCallback(async (input: SkillInput, rescan = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/validate${rescan ? '?rescan=true' : ''}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw new Error(await readApiError(res, 'Validation failed'))
      const result = await res.json()
      saveValidation(result)
      const referralScanId = new URLSearchParams(window.location.search).get('refScan')
      if (referralScanId) {
        void fetch('/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'trust.converted', scanId: referralScanId }),
          keepalive: true,
        }).catch(() => {})
      }
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

  const handleUrlParse = useCallback(async (data: GitHubTarget, rescan = false) => {
    setLoading(true)
    setResolutionHint('')
    try {
      const res = await fetch('/api/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: data.owner,
          repo: data.repo,
          path: data.path,
          branch: data.branch,
          sha: data.sha,
          rescan,
        }),
      })
      if (!res.ok) {
        throw new Error(await readApiError(res, 'Failed to fetch repository'))
      }
      const result = await res.json() as {
        files?: SkillInput['files']
        owner: string
        repo: string
        path: string
        branch?: string
        sha?: string
        analyzeAllSkills?: boolean
        skillCount?: number
        repositoryAudit?: RepositoryAudit
        repositoryMeta?: RepositoryMeta
        warning?: string
        validationResultId?: string
      }
      if (result.validationResultId) {
        toast(`Analyzed all ${result.skillCount || 0} skills`, 'success')
        router.push(`/validate/${result.validationResultId}`)
        return
      }
      if (!Array.isArray(result.files)) {
        throw new Error('GitHub did not return a scannable skill')
      }
      if (typeof result.warning === 'string' && result.warning.length > 0) {
        toast(result.warning, 'info')
      }
      const sourcePath = result.path || '(repository root)'
      const requestPath = data.path || '(repository root)'
      const resolvedHint = result.analyzeAllSkills
        ? `Found ${result.skillCount || result.files.length} skills in ${result.owner}/${result.repo}. Analyzing all skills.`
        : requestPath === sourcePath
        ? `Resolved import: ${result.owner}/${result.repo} on ${result.branch || data.branch || 'default branch'} -> ${sourcePath}`
        : `Resolved import: ${requestPath} -> ${sourcePath}`
      setResolutionHint(resolvedHint)
      if (requestPath !== sourcePath) {
        toast(resolvedHint, 'info')
      }
      await validate({
        name: result.analyzeAllSkills ? `${result.owner}/${result.repo}` : undefined,
        files: result.files,
        analyzeAllSkills: result.analyzeAllSkills,
        source: {
          type: 'github',
          url: data.url,
          owner: result.owner,
          repo: result.repo,
          path: result.path,
          branch: result.branch || data.branch,
          sha: result.sha || data.sha,
          repositoryAudit: result.repositoryAudit,
          repositoryMeta: result.repositoryMeta,
        },
      }, rescan)
    } catch (err) {
      toast('Failed to fetch from GitHub: ' + (err instanceof Error ? err.message : 'Unknown error'), 'error')
    } finally {
      setLoading(false)
    }
  }, [readApiError, router, toast, validate])

  useEffect(() => {
    if (rescanStarted.current) return
    const rescanUrl = new URLSearchParams(window.location.search).get('url')
    const target = rescanUrl ? parseRepositoryUrl(rescanUrl) : null
    if (!target) return

    const timer = window.setTimeout(() => {
      if (rescanStarted.current) return
      rescanStarted.current = true
      void handleUrlParse(target, true)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [handleUrlParse])

  const handlePasteValidate = useCallback(async () => {
    if (!pasteContent.trim()) return
    await validate({ files: [{ path: 'SKILL.md', content: pasteContent }], source: { type: 'paste' } })
  }, [pasteContent, validate])

  return (
    <div
      className="home-hero-shell py-16"
      data-motion-ready={motionReady ? 'true' : 'false'}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      <div className="mx-auto max-w-6xl px-4 flex flex-col items-center">
        {/* Tactical Hero */}
        <div className="text-center max-w-3xl mb-10">
          <div className="home-hero-badge mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-mono uppercase tracking-[0.2em] text-primary shadow-[0_0_12px_-2px_rgba(75,226,119,0.3)]">
            <span className="material-symbols-outlined text-sm">shield</span>
            PRE-INSTALL SKILL DEFENSE GATEWAY
          </div>
          <h1 className="home-hero-title text-4xl sm:text-5xl font-bold tracking-tight text-on-surface mb-3">
            AI Skill Shield
          </h1>
          <p className="home-hero-copy text-base sm:text-lg text-on-surface-secondary max-w-2xl mx-auto leading-relaxed">
            Scan AI agent skills, SKILL.md packages, and GitHub repositories for security vulnerabilities, prompt injection, and install risks before runtime execution.
          </p>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm font-semibold">
            <Link href="/explore" className="text-primary hover:underline flex items-center gap-1 font-mono text-xs">
              Explore public GitHub scans &rarr;
            </Link>
            <Link href="/trust/github/anthropics/skills" className="text-on-surface-variant hover:text-on-surface text-xs font-mono">
              Try a sample report
            </Link>
          </div>
        </div>

        {/* Tactical Scanner Container */}
        <div className="w-full max-w-3xl mb-12 relative">
          <div className="absolute -inset-4 bg-primary/10 blur-3xl rounded-full z-0 scanner-glow pointer-events-none"></div>
          <div className="relative z-10 bg-surface-container/85 backdrop-blur-xl border border-outline-variant/60 rounded-xl overflow-hidden flex flex-col shadow-2xl">
            {/* Top Bar with Window Dots & Tabs */}
            <div className="flex flex-wrap items-center justify-between border-b border-outline-variant/50 bg-surface-container-high/70 px-4 py-2.5 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-error/70"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-secondary/70"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-primary/70"></div>
              </div>
              <div className="flex gap-2 sm:gap-3" role="tablist" aria-label="Skill input method">
                {([['url', 'GitHub Repo'], ['search', 'Search GitHub'], ['upload', 'Upload Files'], ['paste', 'Paste SKILL.md']] as [Tab, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setTab(key)}
                    role="tab"
                    aria-selected={tab === key}
                    className={`px-3 py-1 text-xs font-mono uppercase tracking-wider rounded transition-all ${
                      tab === key
                        ? 'border border-primary/40 bg-primary/15 text-primary font-bold shadow-[0_0_10px_-2px_rgba(75,226,119,0.3)]'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scanner Input Area */}
            <div className="p-6">
              {tab === 'upload' && <Dropzone onFiles={handleDropFiles} />}

              {tab === 'url' && (
                <UrlInput onParse={handleUrlParse} resolutionHint={resolutionHint} loading={loading} />
              )}

              {tab === 'search' && <GitHubSearch loading={loading} onSelect={handleUrlParse} />}

              {tab === 'paste' && (
                <div className="space-y-4">
                  <div className="relative rounded-lg border border-outline-variant/60 bg-surface-container-lowest/90 overflow-hidden input-glow">
                    <div className="border-b border-outline-variant/40 bg-surface-container-high/40 px-3 py-1.5 text-[11px] font-mono text-on-surface-variant flex items-center justify-between">
                      <span>SKILL.md &middot; UTF-8</span>
                      <span>Markdown Buffer</span>
                    </div>
                    <textarea
                      value={pasteContent}
                      onChange={(e) => setPasteContent(e.target.value)}
                      placeholder={`---\nname: my-skill\ndescription: What your skill does and when to use it.\n---\n\n# Your Skill Instructions\n\nStart typing your SKILL.md content here...`}
                      rows={14}
                      className="w-full bg-transparent p-4 text-xs font-mono text-on-surface placeholder-on-surface-variant/40 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-on-surface-variant/60">
                      {pasteContent.length} bytes
                    </span>
                    <button
                      onClick={handlePasteValidate}
                      disabled={!pasteContent.trim() || loading}
                      className="flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-on-primary hover:bg-primary-fixed disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_-3px_rgba(75,226,119,0.4)]"
                    >
                      {loading && (
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      )}
                      <span>{loading ? 'Validating...' : 'Validate Skill'}</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-[11px] font-mono text-on-surface-variant opacity-75">
                <span>Target: <strong className="text-on-surface font-semibold">{tab === 'url' ? 'remote_repository' : tab === 'paste' ? 'buffer_skill_md' : 'package_archive'}</strong></span>
                <span>Engine: <strong className="text-primary font-semibold">v2.0.0</strong></span>
              </div>

              {loading && (
                <div className="mt-4 flex items-center justify-center gap-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs font-mono text-primary animate-pulse">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Executing static heuristics, runtime AST analysis, and security audit...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Start Intelligence 3-Card Grid */}
        <div className="w-full max-w-4xl mb-12">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-on-surface-secondary mb-4 pl-2 border-l-2 border-primary">
            QUICK START INTELLIGENCE
          </h2>
          <div className="home-stat-grid grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="home-stat-card home-stat-card-1 bg-surface-container/70 backdrop-blur-md border border-outline-variant/50 rounded-lg p-5 hover:border-primary/50 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/15 to-transparent rounded-bl-full pointer-events-none"></div>
              <div className="mb-3 text-primary"><span className="material-symbols-outlined text-2xl">verified_user</span></div>
              <h3 className="text-sm font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">11 Validation Axes</h3>
              <p className="text-xs text-on-surface-secondary leading-relaxed">Comprehensive multidimensional analysis covering frontmatter, AST code, permissions, and supply chain.</p>
            </div>
            <div className="home-stat-card home-stat-card-2 bg-surface-container/70 backdrop-blur-md border border-outline-variant/50 rounded-lg p-5 hover:border-primary/50 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-error/15 to-transparent rounded-bl-full pointer-events-none"></div>
              <div className="mb-3 text-error"><span className="material-symbols-outlined text-2xl">warning</span></div>
              <h3 className="text-sm font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">12 Threat Categories</h3>
              <p className="text-xs text-on-surface-secondary leading-relaxed">Real-time heuristics detecting prompt injection, credential exposure, obfuscation, and dangerous shell pipelines.</p>
            </div>
            <div className="home-stat-card home-stat-card-3 bg-surface-container/70 backdrop-blur-md border border-outline-variant/50 rounded-lg p-5 hover:border-primary/50 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-tertiary/15 to-transparent rounded-bl-full pointer-events-none"></div>
              <div className="mb-3 text-tertiary"><span className="material-symbols-outlined text-2xl">terminal</span></div>
              <h3 className="text-sm font-bold text-on-surface mb-1 group-hover:text-primary transition-colors">23 Agent Signatures</h3>
              <p className="text-xs text-on-surface-secondary leading-relaxed">Runtime markers for Claude, Codex, OpenClaw, Cursor, OpenAI Agents, and LangChain ecosystem tools.</p>
            </div>
          </div>
        </div>

      <section className="home-feature-shell">
        <div className="glass-card p-8">
          <h2 className="mb-6 text-center text-2xl font-bold text-on-surface">What AI Skill Shield does</h2>
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

      <section aria-labelledby="what-is-skillshield" className="mt-12 grid gap-6 lg:grid-cols-2">
        <div className="glass-card p-8">
          <h2 id="what-is-skillshield" className="text-2xl font-bold text-on-surface">What is AI Skill Shield?</h2>
          <p className="mt-3 leading-7 text-on-surface-secondary">
            AI Skill Shield is an AI agent skill security scanner, validator, and checker. It helps developers and teams inspect a skill before installation by combining static validation, repository evidence, compatibility checks, and a clear install-risk report.
          </p>
          <p className="mt-3 leading-7 text-on-surface-secondary">
            It is designed for Agent Skills, SKILL.md packages, MCP-adjacent workflows, and public GitHub repositories used by AI agents.
          </p>
        </div>
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-on-surface">How the security check works</h2>
          <ol className="mt-4 space-y-4 text-on-surface-secondary">
            <li><strong className="text-on-surface">1. Import:</strong> provide a repository, uploaded package, or SKILL.md.</li>
            <li><strong className="text-on-surface">2. Inspect:</strong> detect security findings, permissions, compatibility, and repository risks.</li>
            <li><strong className="text-on-surface">3. Decide:</strong> review the score, evidence, install recommendation, and exportable report.</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/ai-skill-checker" className="text-sm font-semibold text-shield-700 hover:text-shield-800">Use the free AI skill checker →</Link>
            <Link href="/skill-md-validator" className="text-sm font-semibold text-shield-700 hover:text-shield-800">Validate a SKILL.md file →</Link>
            <Link href="/rules" className="text-sm font-semibold text-shield-700 hover:text-shield-800">Explore security rules →</Link>
            <Link href="/docs/api" className="text-sm font-semibold text-shield-700 hover:text-shield-800">Read the API docs →</Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="skill-security-guides" className="mt-12">
        <div className="glass-card p-8">
          <h2 id="skill-security-guides" className="text-2xl font-bold text-on-surface">AI agent skill security guides</h2>
          <p className="mt-3 max-w-3xl leading-7 text-on-surface-secondary">
            Learn how to validate SKILL.md files and review skills before adding them to your AI-agent workflow.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Link href="/skill-md-validator" className="rounded-xl border border-outline p-5 transition-colors hover:border-shield-500 hover:bg-shield-50">
              <h3 className="font-semibold text-on-surface">SKILL.md validator</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-secondary">What to validate before an agent follows a skill file.</p>
            </Link>
            <Link href="/claude-code-skill-security" className="rounded-xl border border-outline p-5 transition-colors hover:border-shield-500 hover:bg-shield-50">
              <h3 className="font-semibold text-on-surface">Claude Code skill security</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-secondary">A practical review workflow for third-party Claude Code skills.</p>
            </Link>
            <Link href="/openclaw-skill-security" className="rounded-xl border border-outline p-5 transition-colors hover:border-shield-500 hover:bg-shield-50">
              <h3 className="font-semibold text-on-surface">OpenClaw skill security</h3>
              <p className="mt-2 text-sm leading-6 text-on-surface-secondary">How to assess OpenClaw skills before installation.</p>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="frequently-asked-questions" className="mt-12">
        <div className="glass-card p-8">
          <h2 id="frequently-asked-questions" className="text-2xl font-bold text-on-surface">Frequently asked questions</h2>
          <dl className="mt-6 grid gap-6 md:grid-cols-2">
            {faqItems.map(({ question, answer }) => (
              <div key={question}>
                <dt className="font-semibold text-on-surface">{question}</dt>
                <dd className="mt-2 text-sm leading-6 text-on-surface-secondary">{answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      </div>
    </div>
  )
}
