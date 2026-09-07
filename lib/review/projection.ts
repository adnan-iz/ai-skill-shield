import { buildInstallDecision } from '@/lib/report/install-decision'
import type { InstallDecision } from '@/lib/report/install-decision'
import { determineRiskLevel } from '@/lib/validator/orchestrator'
import type { Finding, Severity, ValidationResult, ValidationSummary } from '@/lib/validator/types'
import { findingKey } from './finding-key'
import type { DecisionApproval, ReviewDecision } from './types'

export interface AppliedFindingDecision {
  findingKey: string
  decision: ReviewDecision
  proposedSeverity?: Severity | null
  approvalStatus: DecisionApproval
}

export interface EffectiveReviewResult {
  result: ValidationResult
  installDecision: InstallDecision
}

const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

/**
 * Applies only human-approved report-affecting decisions to an immutable scan.
 * Scores and axis statuses remain the output of the original validator run.
 */
export function projectEffectiveResult(
  original: ValidationResult,
  decisions: AppliedFindingDecision[],
): EffectiveReviewResult {
  const byKey = new Map(decisions.map((decision) => [decision.findingKey, decision]))
  validateApprovedSeverityChanges(original, byKey)

  const findings = projectFindings(original.id, original.findings, byKey)
  const axes = original.axes.map((axis) => ({
    ...axis,
    findings: projectFindings(original.id, axis.findings, byKey),
  }))
  const result: ValidationResult = {
    ...original,
    axes,
    findings,
    riskLevel: determineRiskLevel(findings),
    summary: buildEffectiveSummary(original.summary, findings),
  }

  return { result, installDecision: buildInstallDecision(result, null) }
}

function projectFindings(
  scanId: string,
  findings: Finding[],
  decisions: Map<string, AppliedFindingDecision>,
): Finding[] {
  return findings.flatMap((finding) => {
    const decision = decisions.get(findingKey(scanId, finding))
    if (!decision || decision.approvalStatus !== 'approved') return [{ ...finding }]
    if (decision.decision === 'false_positive') return []
    if (decision.decision === 'severity_reduced' || decision.decision === 'severity_increased') {
      return [{ ...finding, severity: decision.proposedSeverity! }]
    }
    return [{ ...finding }]
  })
}

function validateApprovedSeverityChanges(
  original: ValidationResult,
  decisions: Map<string, AppliedFindingDecision>,
): void {
  const originals = new Map(original.findings.map((finding) => [findingKey(original.id, finding), finding]))
  for (const [key, decision] of decisions) {
    if (decision.approvalStatus !== 'approved') continue
    if (decision.decision !== 'severity_reduced' && decision.decision !== 'severity_increased') continue
    if (!decision.proposedSeverity) throw new Error(`Approved severity decision ${key} has no proposed severity`)

    const finding = originals.get(key)
    if (!finding) continue
    const direction = SEVERITY_ORDER[decision.proposedSeverity] - SEVERITY_ORDER[finding.severity]
    if (direction === 0 || (decision.decision === 'severity_reduced' ? direction >= 0 : direction <= 0)) {
      throw new Error(`Approved ${decision.decision} decision ${key} has an invalid proposed severity`)
    }
  }
}

function buildEffectiveSummary(original: ValidationSummary, findings: Finding[]): ValidationSummary {
  return {
    ...original,
    criticalCount: findings.filter((finding) => finding.severity === 'critical').length,
    highCount: findings.filter((finding) => finding.severity === 'high').length,
    mediumCount: findings.filter((finding) => finding.severity === 'medium').length,
    lowCount: findings.filter((finding) => finding.severity === 'low').length,
    infoCount: findings.filter((finding) => finding.severity === 'info').length,
  }
}
