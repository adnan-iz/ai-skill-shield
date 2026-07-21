import type { Metadata } from 'next'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import Link from 'next/link'
import { marked } from 'marked'

export const metadata: Metadata = {
  title: 'API Reference',
  description: 'SkillShield API endpoints, request formats, and response details.',
}

export default async function ApiDocsPage() {
  const markdown = await readFile(join(process.cwd(), 'docs', 'api.md'), 'utf8')
  const html = await marked.parse(markdown)

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-shield-500/30 bg-shield-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-shield-500">
            <span className="material-symbols-outlined text-sm">api</span>
            Developer API
          </div>
          <p className="mt-3 max-w-2xl text-on-surface-secondary">
            Build validation, repository auditing, policy checks, and reporting into your workflow.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg border border-outline px-4 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-secondary"
          >
            Dashboard
          </Link>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-shield-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-shield-700"
          >
            OpenAPI JSON
            <span className="material-symbols-outlined text-base">open_in_new</span>
          </a>
        </div>
      </header>

      <article
        className="api-docs mt-8 rounded-2xl border border-outline bg-surface-container p-5 shadow-sm sm:p-10 lg:p-12"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
