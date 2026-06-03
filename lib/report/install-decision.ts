import type { RepositoryAudit } from '@/lib/github/repository-audit'
import type { ValidationResult } from '@/lib/validator/types'

type ApprovalState = 'pending' | 'approved' | 'rejected' | null

export interface InstallChecklistItem {
  label: string
  detail: string
  status: 'pass' | 'warn' | 'fail'
}

export interface InstallDecision {
  label: 'Safe to Review' | 'Needs Manual Review' | 'Do Not Install'
  tone: 'safe' | 'warn' | 'danger'
  summary: string
  checklist: InstallChecklistItem[]
}

function countInstallFindings(result: ValidationResult): number {
  return result.findings.filter((finding) =>
    finding.axis === 'installation' ||
    finding.category === 'Install Script' ||
    finding.category === 'Registry' ||
    finding.category === 'Submodule'
  ).length
}

function countSevereRepoFindings(audit?: RepositoryAudit): number {
  if (!audit) return 0
  return audit.findings.filter((finding) => finding.severity === 'critical' || finding.severity === 'high').length
}

export function buildInstallDecision(result: ValidationResult, approval: ApprovalState): InstallDecision {
  const repositoryAudit = result.source?.repositoryAudit
  const installFindingCount = countInstallFindings(result)
  const severeRepoFindingCount = countSevereRepoFindings(repositoryAudit)
  const hasCriticalStopSignal =
    result.riskLevel === 'critical' ||
    result.summary.criticalCount > 0 ||
    repositoryAudit?.riskLevel === 'critical' ||
    severeRepoFindingCount >= 2

  const needsManualReview =
    hasCriticalStopSignal ||
    result.riskLevel === 'high' ||
    result.summary.highCount > 0 ||
    (repositoryAudit?.findings.length ?? 0) > 0 ||
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

  const checklist: InstallChecklistItem[] = [
    {
      label: 'Skill file parsed',
      detail: `Validated ${result.skillPreview.fileTree.length || 1} scanned file${result.skillPreview.fileTree.length === 1 ? '' : 's'}.`,
      status: 'pass',
    },
    {
      label: 'Install-time execution reviewed',
      detail:
        installFindingCount > 0
          ? `${installFindingCount} install-related validation finding${installFindingCount === 1 ? '' : 's'} need review.`
          : 'No install-time execution findings were raised in the skill payload.',
      status: installFindingCount > 0 ? (result.summary.criticalCount > 0 || result.summary.highCount > 0 ? 'fail' : 'warn') : 'pass',
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
          : repositoryAudit.findings.length > 0
          ? 'warn'
          : 'pass'
        : result.source?.type === 'github'
        ? 'fail'
        : 'warn',
    },
    {
      label: 'Trust signals checked',
      detail: result.source?.repositoryMeta
        ? `${result.source.repositoryMeta.stars} stars, ${result.source.repositoryMeta.forks} forks, ${result.source.repositoryMeta.archived ? 'archived repo' : 'active repo'}.`
        : 'No repository trust metadata attached to this scan.',
      status: result.source?.repositoryMeta
        ? result.source.repositoryMeta.archived
          ? 'fail'
          : 'pass'
        : 'warn',
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

  const summary = hasCriticalStopSignal
    ? 'Automatic execution surfaces were detected with critical or compounding risk. Hold installation until a reviewer clears the repo.'
    : needsManualReview
    ? 'The scan is usable, but install-time behavior still needs a human look before any agent install step.'
    : 'No blocking install signals were found. Review the report, then proceed with normal caution.'

  return { label, tone, summary, checklist }
}
