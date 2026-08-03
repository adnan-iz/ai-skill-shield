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
  checklist: InstallChecklistItem[]
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

function countSevereRepoFindings(audit?: RepositoryAudit): number {
  if (!audit) return 0
  return audit.findings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high').length
}

function countReviewableRepoFindings(audit?: RepositoryAudit): number {
  if (!audit) return 0
  return audit.findings.filter((finding) =>
    finding.severity === 'critical' || finding.severity === 'high' || finding.severity === 'medium'
  ).length
}

export function buildInstallDecision(result: ValidationResult, approval: ApprovalState): InstallDecision {
  const repositoryAudit = result.source?.repositoryAudit
  const installFindingCount = countInstallFindings(result)
  const severeRepoFindingCount = countSevereRepoFindings(repositoryAudit)
  const reviewableRepoFindingCount = countReviewableRepoFindings(repositoryAudit)
  const hasSevereInstallFinding = result.findings.some((finding) =>
    isInstallFinding(finding) && (finding.severity === 'critical' || finding.severity === 'high')
  )
  const hasSevereRepositoryRisk =
    repositoryAudit?.riskLevel === 'critical' ||
    repositoryAudit?.riskLevel === 'high' ||
    severeRepoFindingCount >= 2
  const hasCriticalStopSignal =
    result.riskLevel === 'critical' ||
    result.summary.criticalCount > 0 ||
    repositoryAudit?.riskLevel === 'critical' ||
    severeRepoFindingCount >= 2
  const hasAutomaticExecutionRisk = hasSevereInstallFinding || hasSevereRepositoryRisk

  const needsManualReview =
    hasCriticalStopSignal ||
    result.riskLevel === 'high' ||
    result.summary.highCount > 0 ||
    reviewableRepoFindingCount > 0 ||
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
        ? repositoryAudit.riskLevel === 'critical' || repositoryAudit.riskLevel === 'high'
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
      label: 'Human approval',
      detail:
        approval === 'approved'
          ? 'A reviewer has approved this scan.'
          : approval === 'rejected'
          ? 'A reviewer has rejected this scan.'
          : approval === 'pending'
          ? 'This scan is waiting for reviewer approval.'
          : 'No approval decision has been recorded yet.',
      status:
        approval === 'approved'
          ? 'pass'
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

  return { label, tone, summary, checklist }
}
