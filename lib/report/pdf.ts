import { ValidationResult, AgentCompatibility } from '@/lib/validator/types'
import { generateReportData } from '@/lib/report/report-data'
import { SITE_URL } from '@/lib/site'

const PRINT_FINDING_LIMIT = 25
const PRINT_TOKEN_SECTION_LIMIT = 25

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function classToken(value: unknown): string {
  return String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '')
}

function scoreToColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#7f1d1d'
    case 'high': return '#991b1b'
    case 'medium': return '#92400e'
    case 'low': return '#713f12'
    case 'info': return '#1e40af'
    default: return '#6b7280'
  }
}

function statusLabel(status: AgentCompatibility['status']): string {
  switch (status) {
    case 'full': return 'Full'
    case 'partial': return 'Partial'
    case 'unknown': return 'Unknown'
    case 'incompatible': return 'Incompatible'
  }
}

export async function generatePdfReport(result: ValidationResult): Promise<Buffer> {
  const html = generateHtmlReport(result)
  return Buffer.from(html, 'utf-8')
}

export function generateHtmlReport(result: ValidationResult): string {
  const { summary, recommendations, riskLabel, scoreLabel } = generateReportData(result)
  const severityRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
  const printableFindings = [...result.findings]
    .sort((a, b) => severityRank[a.severity] - severityRank[b.severity])
    .slice(0, PRINT_FINDING_LIMIT)
  const printableRecommendations = [...new Set(recommendations)].slice(0, 25)
  const printableTokenSections = [...result.tokenAnalysis.breakdown]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, PRINT_TOKEN_SECTION_LIMIT)

  const scoreColor = scoreToColor(result.overallScore)
  const gaugeRotation = Math.min((result.overallScore / 100) * 180, 180)

  const axesHtml = result.axes.map(axis => {
    const color = scoreToColor(axis.score)
    return `
      <div class="axis-card">
        <div class="axis-header">
          <strong>${escapeHtml(axis.name)}</strong>
          <span class="badge badge-${classToken(axis.status)}">${escapeHtml(axis.status.toUpperCase())}</span>
        </div>
        <div class="axis-score-row">
          <div class="axis-bar">
            <div class="axis-bar-fill" style="width: ${axis.score}%; background: ${color};"></div>
          </div>
          <span class="axis-score">${escapeHtml(axis.score)}/100</span>
        </div>
        <p class="axis-summary">${escapeHtml(axis.summary)}</p>
        ${axis.findings.length > 0 ? `<details>
          <summary>${axis.findings.length} finding${axis.findings.length > 1 ? 's' : ''}</summary>
          ${axis.findings.map(f => `
            <div class="finding" style="border-left: 4px solid ${severityColor(f.severity)};">
              <span class="badge badge-${classToken(f.severity)}">${escapeHtml(f.severity.toUpperCase())}</span>
              <strong>${escapeHtml(f.title)}</strong>
              <p>${escapeHtml(f.message)}</p>
              ${f.recommendation ? `<p class="rec"><em>Rec:</em> ${escapeHtml(f.recommendation)}</p>` : ''}
            </div>
          `).join('')}
        </details>` : '<p class="no-issues">No issues</p>'}
      </div>`
  }).join('')

  const findingsHtml = printableFindings.map(f => `
    <tr class="finding-row">
      <td><span class="badge badge-${classToken(f.severity)}">${escapeHtml(f.severity.toUpperCase())}</span></td>
      <td>${escapeHtml(f.title)}</td>
      <td class="screen-detail">${escapeHtml(f.category)}</td>
      <td>${escapeHtml(f.filePath || '-')}${f.lineNumber ? `:${escapeHtml(f.lineNumber)}` : ''}</td>
      <td class="screen-detail">${escapeHtml(f.message.substring(0, 80))}${f.message.length > 80 ? '...' : ''}</td>
    </tr>
  `).join('')

  const agentHtml = result.compatibility.agents
    .filter(a => a.status !== 'unknown')
    .map(a => `
      <tr>
        <td>${escapeHtml(a.name)}</td>
        <td><span class="badge badge-${a.status === 'full' ? 'pass' : a.status === 'partial' ? 'warn' : 'fail'}">${statusLabel(a.status)}</span></td>
        <td>${escapeHtml(a.notes || '-')}</td>
      </tr>
    `).join('')

  const recHtml = printableRecommendations.map((r) =>
    `<li>${escapeHtml(r)}</li>`
  ).join('')

  const tokenSectionsHtml = printableTokenSections.map(s =>
    `<tr><td>${escapeHtml(s.section)}</td><td>${escapeHtml(s.tokens)}</td><td>${escapeHtml(result.tokenAnalysis.totalTokens > 0 ? `${((s.tokens / result.tokenAnalysis.totalTokens) * 100).toFixed(1)}%` : '0%')}</td></tr>`
  ).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Skill Shield Report - ${escapeHtml(result.skillName)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #f8fafc; line-height: 1.6; }
    .container { max-width: 1000px; margin: 0 auto; padding: 40px 24px; }
    .header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); color: white; padding: 48px; border-radius: 16px; margin-bottom: 32px; position: relative; overflow: hidden; }
    .header::after { content: ''; position: absolute; top: -50%; right: -20%; width: 400px; height: 400px; background: rgba(255,255,255,0.03); border-radius: 50%; }
    .header h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; position: relative; z-index: 1; }
    .header .subtitle { font-size: 14px; opacity: 0.8; margin-bottom: 2px; position: relative; z-index: 1; }
    .brand-row { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; position: relative; z-index: 1; }
    .brand-logo { width: 52px; height: 52px; border-radius: 12px; }
    .brand-copy { flex: 1; }
    .brand-url { color: white; font-size: 13px; text-decoration: none; opacity: 0.8; }
    .header-meta { display: flex; gap: 24px; flex-wrap: wrap; position: relative; z-index: 1; }
    .header-meta-item { display: flex; flex-direction: column; }
    .header-meta-item .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.7; }
    .header-meta-item .value { font-size: 18px; font-weight: 600; }
    .gauge-container { display: flex; align-items: center; gap: 32px; margin-bottom: 32px; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .gauge { width: 160px; height: 80px; position: relative; overflow: hidden; }
    .gauge-bg { width: 160px; height: 80px; border-radius: 160px 160px 0 0; background: #e5e7eb; position: absolute; top: 0; }
    .gauge-fill { width: 160px; height: 80px; border-radius: 160px 160px 0 0; background: ${scoreColor}; position: absolute; top: 0; transform-origin: bottom center; transform: rotate(${gaugeRotation}deg); }
    .gauge-cover { width: 112px; height: 56px; border-radius: 112px 112px 0 0; background: white; position: absolute; bottom: 0; left: 24px; display: flex; align-items: flex-start; justify-content: center; padding-top: 8px; }
    .gauge-cover span { font-size: 28px; font-weight: 700; color: ${scoreColor}; }
    .gauge-label { text-align: center; margin-top: 4px; font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; }
    .gauge-info { flex: 1; }
    .gauge-info h2 { font-size: 20px; margin-bottom: 4px; }
    .gauge-info .risk-badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
    .risk-badge-critical { background: #fef2f2; color: #991b1b; }
    .risk-badge-high { background: #fee2e2; color: #991b1b; }
    .risk-badge-medium { background: #fffbeb; color: #92400e; }
    .risk-badge-low { background: #f7fee7; color: #713f12; }
    .risk-badge-safe { background: #f0fdf4; color: #166534; }
    .gauge-info p { color: #6b7280; font-size: 14px; }
    .summary-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 32px; }
    .summary-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .summary-card .count { font-size: 28px; font-weight: 700; }
    .summary-card .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #6b7280; margin-top: 4px; }
    .count-critical { color: #991b1b; }
    .count-high { color: #c2410c; }
    .count-medium { color: #a16207; }
    .count-passed { color: #166534; }
    .section { background: white; border-radius: 16px; padding: 32px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .section h2 { font-size: 20px; font-weight: 700; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #f1f5f9; }
    .section h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; }
    .axis-card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
    .axis-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .axis-score-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
    .axis-bar { flex: 1; height: 8px; background: #e5e7eb; border-radius: 999px; overflow: hidden; }
    .axis-bar-fill { height: 100%; border-radius: 999px; }
    .axis-score { font-weight: 700; font-size: 14px; min-width: 50px; text-align: right; }
    .axis-summary { color: #6b7280; font-size: 13px; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-warn { background: #fef9c3; color: #854d0e; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-critical { background: #fef2f2; color: #7f1d1d; }
    .badge-high { background: #fee2e2; color: #991b1b; }
    .badge-medium { background: #fffbeb; color: #92400e; }
    .badge-low { background: #f7fee7; color: #713f12; }
    .badge-info { background: #eff6ff; color: #1e40af; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #f1f5f9; }
    th { background: #f8fafc; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    tr:hover td { background: #f8fafc; }
    .finding { padding: 12px 16px; margin-bottom: 8px; border-radius: 8px; }
    .finding .badge { margin-bottom: 4px; }
    .finding strong { display: block; margin: 4px 0; }
    .finding p { font-size: 13px; color: #4b5563; }
    .finding .rec { font-size: 12px; color: #6b7280; margin-top: 4px; }
    .no-issues { color: #22c55e; font-weight: 500; font-size: 13px; }
    details { margin-top: 8px; }
    details summary { cursor: pointer; font-weight: 500; font-size: 13px; color: #3b82f6; }
    ol.recommendations { padding-left: 20px; }
    ol.recommendations li { margin-bottom: 8px; font-size: 14px; color: #374151; }
    .file-tree { font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.8; white-space: pre; }
    .footer { text-align: center; padding: 32px; color: #9ca3af; font-size: 12px; }
    .footer strong { color: #6b7280; }
    .report-note { margin-bottom: 12px; color: #6b7280; font-size: 12px; }
    @media print {
      html, body { background: white; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .container { padding: 0; }
      .header { padding: 28px; margin-bottom: 18px; break-inside: avoid; }
      .gauge-container { padding: 22px; margin-bottom: 18px; box-shadow: none; border: 1px solid #e5e7eb; break-inside: avoid; }
      .summary-row { grid-template-columns: repeat(6, 1fr); margin-bottom: 18px; break-inside: avoid; }
      .summary-card { padding: 14px 8px; }
      .summary-card .count { font-size: 22px; }
      .summary-card, .section { box-shadow: none; border: 1px solid #e5e7eb; }
      .section { padding: 22px; margin-bottom: 16px; }
      .axis-card, tr { break-inside: avoid; }
      .axes-section { break-before: page; }
      details { display: none; }
      .screen-detail { display: none; }
      thead { display: table-header-group; }
      .findings-section { break-before: page; }
      tr:hover td { background: transparent; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand-row">
        <img class="brand-logo" src="/skill-shield-logo.svg" alt="AI Skill Shield logo">
        <div class="brand-copy">
          <h1>AI Skill Shield Validation Report</h1>
          <p class="subtitle">Agent Skills Compliance & Quality Analysis</p>
          <a class="brand-url" href="${escapeHtml(SITE_URL)}">${escapeHtml(SITE_URL.replace(/^https?:\/\//, ''))}</a>
        </div>
      </div>
      <div class="header-meta">
        <div class="header-meta-item">
          <span class="label">Skill Name</span>
          <span class="value">${escapeHtml(result.skillName)}</span>
        </div>
        <div class="header-meta-item">
          <span class="label">Report ID</span>
          <span class="value" style="font-size: 13px; font-family: monospace;">${escapeHtml(result.id)}</span>
        </div>
        <div class="header-meta-item">
          <span class="label">Validated</span>
          <span class="value" style="font-size: 14px;">${escapeHtml(new Date(result.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }))}</span>
        </div>
      </div>
    </div>

    <div class="gauge-container">
      <div>
        <div class="gauge">
          <div class="gauge-bg"></div>
          <div class="gauge-fill" style="transform: rotate(${gaugeRotation}deg);"></div>
          <div class="gauge-cover"><span>${escapeHtml(result.overallScore)}</span></div>
        </div>
        <div class="gauge-label">Static Score</div>
      </div>
      <div class="gauge-info">
        <span class="risk-badge risk-badge-${classToken(result.riskLevel)}">${escapeHtml(riskLabel)}</span>
        <h2>${escapeHtml(scoreLabel)}</h2>
        <p>${escapeHtml(summary)}</p>
      </div>
    </div>

    <div class="summary-row">
      <div class="summary-card"><div class="count">${escapeHtml(result.findings.length.toLocaleString('en-US'))}</div><div class="label">Total Findings</div></div>
      ${result.batch ? `<div class="summary-card"><div class="count">${escapeHtml(result.batch.totalSkills.toLocaleString('en-US'))}</div><div class="label">Skills Scanned</div></div>` : ''}
      <div class="summary-card"><div class="count count-critical">${escapeHtml(result.summary.criticalCount)}</div><div class="label">Critical</div></div>
      <div class="summary-card"><div class="count count-high">${escapeHtml(result.summary.highCount)}</div><div class="label">High</div></div>
      <div class="summary-card"><div class="count count-medium">${escapeHtml(result.summary.mediumCount)}</div><div class="label">Medium</div></div>
      <div class="summary-card"><div class="count count-passed">${escapeHtml(result.summary.passed)}</div><div class="label">Passed Axes</div></div>
    </div>

    <div class="section axes-section">
      <h2>Validation Axes</h2>
      ${axesHtml}
    </div>

    <div class="section">
      <h2>Token Usage</h2>
      <p><strong>Total:</strong> ${escapeHtml(result.tokenAnalysis.totalTokens)} / ${escapeHtml(result.tokenAnalysis.limit)} tokens (${result.tokenAnalysis.isUnderLimit ? 'Within limit' : 'Exceeds limit'})</p>
      <p><strong>Frontmatter:</strong> ${escapeHtml(result.tokenAnalysis.frontmatterTokens)} tokens | <strong>Body:</strong> ${escapeHtml(result.tokenAnalysis.bodyTokens)} tokens</p>
      ${result.tokenAnalysis.breakdown.length > 0 ? `
        ${result.tokenAnalysis.breakdown.length > printableTokenSections.length ? `<p class="report-note">Showing the ${printableTokenSections.length} largest token sections of ${escapeHtml(result.tokenAnalysis.breakdown.length.toLocaleString('en-US'))}.</p>` : ''}
        <table>
          <thead><tr><th>Section</th><th>Tokens</th><th>%</th></tr></thead>
          <tbody>${tokenSectionsHtml}</tbody>
        </table>
      ` : '<p>No sections to display.</p>'}
    </div>

    <div class="section">
      <h2>Agent Compatibility</h2>
      <p><strong>Overall Score:</strong> ${escapeHtml(result.compatibility.overallCompatibility)}/100</p>
      ${agentHtml ? `
        <table>
          <thead><tr><th>Agent</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>${agentHtml}</tbody>
        </table>
      ` : '<p>No agent-specific patterns detected.</p>'}
    </div>

    <div class="section findings-section">
      <h2>Detailed Findings</h2>
      ${result.findings.length > 0 ? `
        ${result.findings.length > printableFindings.length ? `<p class="report-note">Showing the ${printableFindings.length} highest-priority findings of ${escapeHtml(result.findings.length.toLocaleString('en-US'))}. Export CSV or SARIF for the complete result.</p>` : ''}
        <table>
          <thead><tr><th>Severity</th><th>Title</th><th class="screen-detail">Category</th><th>File</th><th class="screen-detail">Message</th></tr></thead>
          <tbody>${findingsHtml}</tbody>
        </table>
      ` : '<p>No findings to report.</p>'}
    </div>

    <div class="section">
      <h2>Recommendations</h2>
      ${recommendations.length > 0 ? `<ol class="recommendations">${recHtml}</ol>${recommendations.length > printableRecommendations.length ? `<p class="report-note">Showing ${printableRecommendations.length} of ${recommendations.length} recommendations.</p>` : ''}` : '<p>No recommendations. Skill meets all validation criteria.</p>'}
    </div>

    <div class="footer">
      <p>Generated by <strong>AI Skill Shield</strong> - Agent Skills Validator</p>
      <p>Report ID: ${escapeHtml(result.id)} | ${escapeHtml(new Date(result.timestamp).toISOString())}</p>
    </div>
  </div>
</body>
</html>`
}
