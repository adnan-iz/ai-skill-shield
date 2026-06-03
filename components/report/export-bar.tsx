"use client"

import type { ValidationResult, Finding } from '@/lib/validator/types'

interface ExportBarProps {
  result: ValidationResult
}

export default function ExportBar({ result }: ExportBarProps) {
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
    let md = `# SkillShield Report: ${data.skillName}\n\n`
    md += `**Overall Score:** ${data.overallScore}/100\n`
    md += `**Risk Level:** ${data.riskLevel}\n`
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

  function copyLink() {
    const url = `${window.location.origin}/validate/${result.id}`
    navigator.clipboard.writeText(url).catch(() => {})
  }

  const btnClass = "inline-flex items-center gap-1.5 rounded-lg border border-outline bg-surface-container px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-secondary transition-colors"

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">Download Report</p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={exportPdf} className={btnClass}>
            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
            Print / Save PDF
          </button>
          <button onClick={exportHtml} className={btnClass}>
            <span className="material-symbols-outlined text-lg">code</span>
            Export HTML
          </button>
          <button onClick={exportJson} className={btnClass}>
            <span className="material-symbols-outlined text-lg">data_object</span>
            Export JSON
          </button>
          <button onClick={exportSarif} className={btnClass}>
            <span className="material-symbols-outlined text-lg">code_blocks</span>
            Export SARIF
          </button>
          <button onClick={exportCsv} className={btnClass}>
            <span className="material-symbols-outlined text-lg">table_rows</span>
            Export CSV
          </button>
          <button onClick={exportMarkdown} className={btnClass}>
            <span className="material-symbols-outlined text-lg">description</span>
            Export Markdown
          </button>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">Share</p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={copyLink} className={btnClass}>
            <span className="material-symbols-outlined text-lg">link</span>
            Copy Link
          </button>
        </div>
      </div>
    </div>
  )
}
