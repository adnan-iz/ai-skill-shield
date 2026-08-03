"use client"

import type { ValidationResult, Finding } from '@/lib/validator/types'
import { githubBadgePath, githubTrustPath, trustTargetForResult } from '@/lib/trust'

interface ExportBarProps {
  result: ValidationResult
}

export default function ExportBar({ result }: ExportBarProps) {
  const trustTarget = trustTargetForResult(result)
  const trustPath = trustTarget ? githubTrustPath(trustTarget) : null
  const badgePath = trustTarget ? githubBadgePath(trustTarget) : null

  function track(event: 'report.share' | 'report.badge_copy') {
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, scanId: result.id }),
      keepalive: true,
    }).catch(() => {})
  }

  function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportJson() {
    const resp = await fetch(`/api/report?id=${result.id}&format=json`)
    if (!resp.ok) return
    const blob = await resp.blob()
    downloadBlob(blob, `skillshield-${result.id}.json`)
  }

  async function exportHtml() {
    const resp = await fetch(`/api/report?id=${result.id}&format=html`)
    if (!resp.ok) return
    const blob = await resp.blob()
    downloadBlob(blob, `skillshield-${result.id}.html`)
  }

  function exportPdf() {
    window.open(`/api/report?id=${result.id}&format=html`, '_blank')
  }

  async function exportSarif() {
    const resp = await fetch(`/api/report?id=${result.id}&format=sarif`)
    if (!resp.ok) return
    const blob = await resp.blob()
    downloadBlob(blob, `skillshield-${result.id}.sarif`)
  }

  function exportCsv() {
    const header = 'Severity,Category,Title,File,Line,Recommendation\n'
    const rows = result.findings.map(f =>
      `"${f.severity}","${f.category}","${f.title}","${f.filePath || ''}","${f.lineNumber || ''}","${(f.recommendation || '').replace(/"/g, '""')}"`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    downloadBlob(blob, `skillshield-${result.id}.csv`)
  }

  async function exportMarkdown() {
    const resp = await fetch(`/api/report?id=${result.id}&format=json`)
    if (!resp.ok) return
    const data = await resp.json()
    let md = `# AI Skill Shield Report: ${data.skillName}\n\n`
    md += `**Static Score:** ${data.overallScore}/100\n`
    md += `**Highest Finding Severity:** ${data.riskLevel}\n`
    md += `**Findings:** ${data.findings.length}\n\n`
    if (data.findings.length > 0) {
      md += `| Severity | Category | Title | File:Line | Recommendation |\n`
      md += `|----------|----------|-------|-----------|----------------|\n`
      data.findings.forEach((f: Finding) => {
        md += `| ${f.severity} | ${f.category} | ${f.title} | ${f.filePath || 'SKILL.md'}:${f.lineNumber || '-'} | ${(f.recommendation || '').replace(/\|/g, '\\|')} |\n`
      })
    }
    const blob = new Blob([md], { type: 'text/markdown' })
    downloadBlob(blob, `skillshield-${result.id}.md`)
  }

  async function copyLink() {
    const url = `${window.location.origin}${trustPath || `/validate/${result.id}`}`
    try {
      await navigator.clipboard.writeText(url)
      track('report.share')
    } catch {}
  }

  async function copyBadge() {
    if (!badgePath || !trustPath) return
    const origin = window.location.origin
    try {
      await navigator.clipboard.writeText(`[![AI Skill Shield](${origin}${badgePath})](${origin}${trustPath})`)
      track('report.badge_copy')
    } catch {}
  }

  const btnClass = "inline-flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-secondary transition-colors"
  const primaryBtnClass = "inline-flex items-center gap-1.5 rounded-lg bg-shield-600 px-4 py-2 text-sm font-semibold text-white hover:bg-shield-700 transition-colors"

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">Share trust result</p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => void copyLink()} className={trustPath ? primaryBtnClass : btnClass}>
            <span className="material-symbols-outlined text-lg">link</span>
            {trustPath ? 'Copy Public Trust Link' : 'Copy Link'}
          </button>
          {trustPath && badgePath && (
            <>
              <button onClick={() => void copyBadge()} className={btnClass}>
                <span className="material-symbols-outlined text-lg">verified</span>
                Copy README Badge
              </button>
              <a href={trustPath} className={btnClass}>
                <span className="material-symbols-outlined text-lg">public</span>
                Open Public Trust Page
              </a>
            </>
          )}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">Download report</p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={exportPdf} className={btnClass}><span className="material-symbols-outlined text-lg">picture_as_pdf</span>Print / Save PDF</button>
          <button onClick={exportHtml} className={btnClass}><span className="material-symbols-outlined text-lg">code</span>Export HTML</button>
          <button onClick={exportJson} className={btnClass}><span className="material-symbols-outlined text-lg">data_object</span>Export JSON</button>
          <button onClick={exportSarif} className={btnClass}><span className="material-symbols-outlined text-lg">code_blocks</span>Export SARIF</button>
          <button onClick={exportCsv} className={btnClass}><span className="material-symbols-outlined text-lg">table_rows</span>Export CSV</button>
          <button onClick={exportMarkdown} className={btnClass}><span className="material-symbols-outlined text-lg">description</span>Export Markdown</button>
        </div>
      </div>
    </div>
  )
}
