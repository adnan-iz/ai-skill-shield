import { AxisResult, Finding, SkillFile } from '@/lib/validator/types'
import { ALL_PATTERNS } from '@/lib/scanner/patterns'
import { scanForSecrets } from '@/lib/scanner/secrets'
import { scanObfuscation } from '@/lib/scanner/obfuscation'
import { runSemgrepScan } from '@/lib/semgrep'
import { extractPermissionManifest, detectPermissionViolations } from '@/lib/permissions'
import { scanFilesForMcp } from '@/lib/mcp'
import { analyzeCapabilityDrift } from '@/lib/scanner/capability-drift'

let findingCounter = 0

export function runSecurityScan(files: SkillFile[], _content: string): AxisResult {
  const findings: Finding[] = []

  for (const file of files) {
    for (const pattern of ALL_PATTERNS) {
      const finding = pattern.detect(file.content, file.path)
      if (finding) {
        findings.push(finding)
      }
    }

    const secretFindings = scanForSecrets(file.content, file.path)
    findings.push(...secretFindings)

    const obfuscationFindings = scanObfuscation(file.content, file.path)
    findings.push(...obfuscationFindings)

    const semgrepFindings = runSemgrepScan(file.content, file.path)
    findings.push(...semgrepFindings)
  }

  // Scan files for MCP tool definitions and schema vulnerabilities
  const mcpFindings = scanFilesForMcp(files)
  findings.push(...mcpFindings)

  // Analyze capability drift (declared permissions vs actual detected code behaviors)
  const driftResult = analyzeCapabilityDrift(files, _content, findingCounter)
  findingCounter = driftResult.nextId
  findings.push(...driftResult.findings)

  const manifest = extractPermissionManifest(_content)
  if (manifest) {
    const violations = detectPermissionViolations(_content, '', manifest)
    for (const v of violations) {
      findings.push({
        id: `finding-perm-${++findingCounter}`,
        axis: 'security',
        severity: v.severity,
        category: 'permission-violation',
        title: `Permission violation: ${v.type}`,
        message: v.message,
        filePath: '',
        snippet: `declared: ${v.declared}, detected: ${v.detected}`,
        recommendation: `Add "${v.detected}" to the ${v.type} permissions in the permission manifest.`,
      })
    }
  }

  const criticalCount = findings.filter(f => f.severity === 'critical').length
  const highCount = findings.filter(f => f.severity === 'high').length
  const mediumCount = findings.filter(f => f.severity === 'medium').length
  const lowCount = findings.filter(f => f.severity === 'low').length

  let score = 100
  score -= criticalCount * 50
  score -= highCount * 25
  score -= mediumCount * 10
  score -= lowCount * 5
  score = Math.max(0, Math.min(100, score))

  let summary: string
  if (criticalCount > 0) {
    summary = `CRITICAL: ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low issues`
  } else if (highCount > 0) {
    summary = `${highCount} high, ${mediumCount} medium, ${lowCount} low security issues`
  } else if (mediumCount > 0) {
    summary = `${mediumCount} medium, ${lowCount} low security issues`
  } else if (lowCount > 0) {
    summary = `${lowCount} low-severity issues found`
  } else {
    summary = 'No security issues detected'
  }

  return {
    name: 'Security Scan',
    key: 'security',
    score,
    status: score >= 90 ? 'pass' : score >= 50 ? 'warn' : 'fail',
    summary,
    findings,
  }
}
