import { Finding, ValidationResult } from '@/lib/validator/types'

export interface ReportSection {
  id: string
  title: string
  content: string
  order: number
}

function getRiskLabel(riskLevel: ValidationResult['riskLevel']): string {
  switch (riskLevel) {
    case 'critical': return 'Critical severity'
    case 'high': return 'High severity'
    case 'medium': return 'Medium severity'
    case 'low': return 'Low severity'
    case 'safe': return 'No severity-rated findings'
  }
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 80) return 'Good'
  if (score >= 60) return 'Fair'
  if (score >= 40) return 'Poor'
  return 'Very Poor'
}

interface CategorizedRecs {
  critical: string[]
  high: string[]
  medium: string[]
  low: string[]
  info: string[]
}

function categorizeRecommendations(findings: Finding[]): CategorizedRecs {
  const recs: CategorizedRecs = { critical: [], high: [], medium: [], low: [], info: [] }
  for (const f of findings) {
    if (f.recommendation) {
      recs[f.severity].push(f.recommendation)
    }
  }
  return recs
}

function buildTreeString(
  item: { path: string; type: string; size?: number; children?: { path: string; type: string; size?: number; children?: unknown[] }[] },
  prefix: string
): string {
  const name = item.path.split('/').pop() || item.path
  const sizeStr = item.type === 'file' && item.size !== undefined ? ` (${formatSize(item.size)})` : ''
  const icon = item.type === 'directory' ? '[DIR]' : '[FILE]'
  let result = `${prefix}${icon} ${name}${sizeStr}`
  if (item.children && item.children.length > 0) {
    for (let i = 0; i < item.children.length; i++) {
      const child = item.children[i]
      const isLast = i === item.children.length - 1
      result += '\n' + buildTreeString(child as Parameters<typeof buildTreeString>[0], `${prefix}${isLast ? '   ' : '  |'}`)
    }
  }
  return result
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function statusLabel(status: 'full' | 'partial' | 'unknown' | 'incompatible'): string {
  switch (status) {
    case 'full': return 'Fully compatible'
    case 'partial': return 'Partially compatible'
    case 'unknown': return 'Unknown'
    case 'incompatible': return 'Incompatible'
  }
}

export function generateReportData(result: ValidationResult): {
  summary: string
  sections: ReportSection[]
  recommendations: string[]
  riskLabel: string
  scoreLabel: string
} {
  const riskLabel = getRiskLabel(result.riskLevel)
  const scoreLabel = getScoreLabel(result.overallScore)

  const categorizedRecs = categorizeRecommendations(result.findings)
  const recommendations = [
    ...categorizedRecs.critical,
    ...categorizedRecs.high,
    ...categorizedRecs.medium,
    ...categorizedRecs.low,
    ...categorizedRecs.info,
  ]

  const summary = `Skill "${result.skillName}" scored ${result.overallScore}/100 (${scoreLabel}); its highest finding severity is ${result.riskLevel.toUpperCase()}. ${result.findings.length} total findings: ${result.summary.criticalCount} critical, ${result.summary.highCount} high, ${result.summary.mediumCount} medium, ${result.summary.lowCount} low, ${result.summary.infoCount} info. ${result.summary.passed} axes passed, ${result.summary.warnings} warnings, ${result.summary.failed} failed.`

  const sections: ReportSection[] = [
    {
      id: 'executive-summary',
      title: 'Executive Summary',
      content: `## Validation Results for "${result.skillName}"

**Static Score:** ${result.overallScore}/100 (${scoreLabel})
**Highest Finding Severity:** ${riskLabel}
**Total Findings:** ${result.findings.length}
**Validated At:** ${new Date(result.timestamp).toLocaleString()}

### Axis Results
${result.axes.map(a => `- **${a.name}**: ${a.score}/100 (${a.status.toUpperCase()}) - ${a.summary}`).join('\n')}

### Finding Summary
- Critical: ${result.summary.criticalCount}
- High: ${result.summary.highCount}
- Medium: ${result.summary.mediumCount}
- Low: ${result.summary.lowCount}
- Info: ${result.summary.infoCount}
`,
      order: 0,
    },
    {
      id: 'security',
      title: 'Security Analysis',
      content: (() => {
        const secAxis = result.axes.find(a => a.key === 'security')
        if (!secAxis) return 'Security scan not performed.'
        return `**Security Score:** ${secAxis.score}/100\n\n${
          secAxis.findings.length > 0
            ? secAxis.findings.map(f =>
                `- **${f.severity.toUpperCase()}**: ${f.title} - ${f.message}\n  *Recommendation:* ${f.recommendation}`
              ).join('\n\n')
            : 'No security issues found.'
        }`
      })(),
      order: 1,
    },
    {
      id: 'quality',
      title: 'Quality Assessment',
      content: (() => {
        const qAxis = result.axes.find(a => a.key === 'quality')
        if (!qAxis) return 'Quality assessment not performed.'
        return `**Quality Score:** ${qAxis.score}/100\n\n${
          qAxis.findings.length > 0
            ? qAxis.findings.map(f =>
                `- **${f.severity.toUpperCase()}**: ${f.title} - ${f.message}\n  *Recommendation:* ${f.recommendation}`
              ).join('\n\n')
            : 'No quality issues found.'
        }`
      })(),
      order: 2,
    },
    {
      id: 'compatibility',
      title: 'Agent Compatibility',
      content: `**Compatibility Score:** ${result.compatibility.overallCompatibility}/100\n\n### Agent Support\n${
        result.compatibility.agents
          .filter(a => a.status !== 'unknown')
          .map(a => `- **${a.name}**: ${statusLabel(a.status)}${a.notes ? ` (${a.notes})` : ''}`)
          .join('\n') || 'No agent-specific patterns detected.'
      }`,
      order: 3,
    },
    {
      id: 'token-analysis',
      title: 'Token Usage',
      content: `**Total Tokens:** ${result.tokenAnalysis.totalTokens} / ${result.tokenAnalysis.limit}
**Frontmatter Tokens:** ${result.tokenAnalysis.frontmatterTokens}
**Body Tokens:** ${result.tokenAnalysis.bodyTokens}
**Within Limit:** ${result.tokenAnalysis.isUnderLimit ? 'Yes' : 'No'}

### Section Breakdown
${
  result.tokenAnalysis.breakdown.map(s =>
    `- **${s.section}**: ${s.tokens} tokens${result.tokenAnalysis.totalTokens > 0 ? ` (${((s.tokens / result.tokenAnalysis.totalTokens) * 100).toFixed(1)}%)` : ''}`
  ).join('\n')
}`,
      order: 4,
    },
    {
      id: 'detailed-findings',
      title: 'Detailed Findings',
      content: result.findings.length > 0
        ? result.findings.map(f =>
`### ${f.title}
- **Severity:** ${f.severity.toUpperCase()}
- **Category:** ${f.category}
- **File:** ${f.filePath || 'N/A'}
- **Message:** ${f.message}
${f.snippet ? `- **Snippet:** \`${f.snippet.substring(0, 100)}\`` : ''}
- **Recommendation:** ${f.recommendation}`
        ).join('\n\n')
        : 'No findings to report.',
      order: 5,
    },
    {
      id: 'recommendations',
      title: 'Recommendations',
      content: recommendations.length > 0
        ? recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
        : 'No recommendations. Skill meets all validation criteria.',
      order: 6,
    },
    {
      id: 'file-structure',
      title: 'File Structure',
      content: result.skillPreview.fileTree
        .map(item => buildTreeString(item, ''))
        .join('\n'),
      order: 7,
    },
  ]

  return { summary, sections, recommendations, riskLabel, scoreLabel }
}
