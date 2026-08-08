import type { RepositoryAudit } from '@/lib/github/repository-audit'
import { countFileTree } from '@/lib/report/metrics'
import type { ValidationResult } from '@/lib/validator/types'

type ApprovalState = 'pending' | 'approved' | 'rejected' | null

export interface InstallChecklistItem {
  label: string
  detail: string
  status: 'pass' | 'warn' | 'fail' | 'neutral'
}

export interface InstallDecision {
  label: 'Safe to Review' | 'Needs Manual Review' | 'Do Not Install'
  tone: 'safe' | 'warn' | 'danger'
  summary: string
  reasons: InstallDecisionReason[]
  checklist: InstallChecklistItem[]
}

export interface InstallDecisionReason {
  label: string
  detail: string
}

function isInstallFinding(finding: ValidationResult['findings'][number]): boolean {
  return (
    finding.axis === 'installation' ||
    finding.category === 'Install Script' ||
    finding.category === 'Registry' ||
    finding.category === 'Submodule'
  )
}

function countInstallFindings(result: ValidationResult): number {
  return result.findings.filter(isInstallFinding).length
}

function isPublishOnlyLifecycleFinding(finding: RepositoryAudit['findings'][number]): boolean {
  return finding.id.toLowerCase().endsWith(':prepublishonly')
}

export function buildInstallDecision(result: ValidationResult, approval: ApprovalState): InstallDecision {
  const repositoryAudit = result.source?.repositoryAudit
  const repositoryFindings = repositoryAudit?.findings.filter((finding) => !isPublishOnlyLifecycleFinding(finding)) ?? []
  const installFindingCount = countInstallFindings(result)
  const severeRepoFindingCount = repositoryFindings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high').length
  const reviewableRepoFindingCount = repositoryFindings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high' || finding.severity === 'medium').length
  const hasCriticalRepoFinding = repositoryFindings.some((finding) => finding.severity === 'critical')
  const hasSevereInstallFinding = result.findings.some((finding) =>
    isInstallFinding(finding) && (finding.severity === 'critical' || finding.severity === 'high')
  )
  const hasSevereRepositoryRisk = severeRepoFindingCount > 0
  const hasCriticalStopSignal =
    result.riskLevel === 'critical' ||
    result.summary.criticalCount > 0 ||
    hasCriticalRepoFinding ||
    severeRepoFindingCount >= 2
  const hasAutomaticExecutionRisk = hasSevereInstallFinding || hasSevereRepositoryRisk
  const hasSecurityReviewSignal = result.findings.some((finding) =>
    finding.axis === 'security' &&
    finding.severity === 'medium' &&
    ['staged-malware', 'clickfix-attack', 'data-exfiltration', 'second-order-injection'].includes(finding.category)
  )

  const reasons: InstallDecisionReason[] = []
  if (result.summary.criticalCount > 0) {
    reasons.push({
      label: `${result.summary.criticalCount} critical blocker${result.summary.criticalCount === 1 ? '' : 's'} detected`,
      detail: 'Critical findings always block installation until the underlying evidence is resolved and a new scan is run.',
    })
  }
  if (hasCriticalRepoFinding) {
    reasons.push({
      label: 'Critical repository risk detected',
      detail: 'Repository-level execution or install-surface evidence contains a critical finding.',
    })
  }
  if (hasSevereInstallFinding) {
    reasons.push({
      label: 'High-risk install behavior detected',
      detail: 'An install-related finding requires remediation before an agent installs this skill.',
    })
  }
  if (reasons.length === 0 && reviewableRepoFindingCount > 0) {
    reasons.push({
      label: 'Repository risk needs review',
      detail: `${reviewableRepoFindingCount} repository finding${reviewableRepoFindingCount === 1 ? '' : 's'} need a human review before installation.`,
    })
  }
  if (reasons.length === 0 && result.summary.highCount > 0) {
    reasons.push({
      label: `${result.summary.highCount} high-severity finding${result.summary.highCount === 1 ? '' : 's'} detected`,
      detail: 'High-severity findings require a human review before installation.',
    })
  }
  if (reasons.length === 0 && hasSecurityReviewSignal) {
    reasons.push({
      label: 'Contextual security signals need review',
      detail: 'The scanner found suspicious behavior patterns without a confirmed installation-time execution path.',
    })
  }

  const needsManualReview =
    hasCriticalStopSignal ||
    result.riskLevel === 'high' ||
    result.summary.highCount > 0 ||
    reviewableRepoFindingCount > 0 ||
    hasSecurityReviewSignal ||
    approval === 'pending' ||
    approval === 'rejected'

  const label = hasCriticalStopSignal
    ? 'Do Not Install'
    : needsManualReview
    ? 'Needs Manual Review'
    : 'Safe to Review'

  const tone = hasCriticalStopSignal
    ? 'danger'
    : needsManualReview
    ? 'warn'
    : 'safe'

  const fileCount = countFileTree(result.skillPreview.fileTree) || 1

  const checklist: InstallChecklistItem[] = [
    {
      label: result.batch ? 'Skill files parsed' : 'Skill file parsed',
      detail: `Validated ${fileCount.toLocaleString('en-US')} scanned file${fileCount === 1 ? '' : 's'}.`,
      status: 'pass',
    },
    {
      label: 'Install-time execution reviewed',
      detail:
        installFindingCount > 0
          ? `${installFindingCount} install-related validation finding${installFindingCount === 1 ? '' : 's'} need review.`
          : 'No install-time execution findings were raised in the skill payload.',
      status: installFindingCount > 0 ? (hasSevereInstallFinding ? 'fail' : 'warn') : 'pass',
    },
    {
      label: 'Repository install surface checked',
      detail: repositoryAudit
        ? `${repositoryAudit.summary.installSurfaceCount} install surfaces and ${repositoryAudit.findings.length} repo-level findings were audited.`
        : result.source?.type === 'github'
        ? 'GitHub import completed without repository audit data.'
        : 'Repository-level audit is only available for GitHub repo scans.',
      status: repositoryAudit
        ? severeRepoFindingCount > 0
          ? 'fail'
          : reviewableRepoFindingCount > 0
          ? 'warn'
          : 'pass'
        : result.source?.type === 'github'
        ? 'fail'
        : 'warn',
    },
    {
      label: 'Repository context',
      detail: result.source?.repositoryMeta
        ? `${result.source.repositoryMeta.stars} stars, ${result.source.repositoryMeta.forks} forks, ${result.source.repositoryMeta.archived ? 'archived repo' : 'active repo'}.`
        : 'No repository trust metadata attached to this scan.',
      status: result.source?.repositoryMeta?.archived ? 'fail' : 'neutral',
    },
    {
      label: 'Human review',
      detail:
        approval === 'approved'
          ? 'A reviewer completed this scan review. This never overrides an automatic install block.'
        : approval === 'rejected'
          ? 'A reviewer escalated this scan. Installation remains blocked until a new scan is clear.'
        : approval === 'pending'
          ? 'This scan is waiting for a reviewer to inspect the evidence.'
          : 'No human review has been recorded yet.',
      status:
        approval === 'approved'
          ? 'neutral'
        : approval === 'rejected'
          ? 'fail'
          : 'warn',
    },
  ]

  const summary = hasCriticalStopSignal && hasAutomaticExecutionRisk
    ? 'Automatic execution surfaces were detected with critical or compounding risk. Hold installation until a reviewer clears the repo.'
    : hasCriticalStopSignal
    ? 'Critical security findings were detected. Hold installation and review the evidence before proceeding.'
    : needsManualReview
    ? 'The scan is usable, but install-time behavior still needs a human look before any agent install step.'
    : 'No blocking install signals were found. Review the report, then proceed with normal caution.'

  return { label, tone, summary, reasons, checklist }
}
