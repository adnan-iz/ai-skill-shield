import type { ValidationResult, Finding } from '@/lib/validator/types'
import {
  Role,
  ApprovalStatus,
  GovernancePolicy,
  ApprovalRecord,
  GovernanceEvaluation,
  DEFAULT_GOVERNANCE_POLICY,
} from './types'

function isCapabilityDriftFinding(finding: Finding): boolean {
  const cat = (finding.category || '').toLowerCase()
  const ruleId = (finding.ruleId || '').toUpperCase()
  const title = (finding.title || '').toLowerCase()
  const message = (finding.message || '').toLowerCase()

  return (
    cat === 'capability-drift' ||
    ruleId.startsWith('SS-DRIFT') ||
    title.includes('capability drift') ||
    message.includes('capability drift')
  )
}

function isSecretFinding(finding: Finding): boolean {
  const cat = (finding.category || '').toLowerCase()
  const ruleId = (finding.ruleId || '').toLowerCase()
  const id = (finding.id || '').toLowerCase()

  return (
    cat === 'secret-detection' ||
    cat.includes('secret') ||
    ruleId.includes('secret') ||
    id.startsWith('secret-')
  )
}

/**
 * Evaluates a ValidationResult against a GovernancePolicy to determine
 * whether human governance / multi-role approval is required.
 */
export function evaluateGovernancePolicy(
  result: ValidationResult,
  policy?: Partial<GovernancePolicy>
): GovernanceEvaluation {
  const effectivePolicy: GovernancePolicy = {
    ...DEFAULT_GOVERNANCE_POLICY,
    ...policy,
  }

  const score = result.overallScore ?? 0
  const riskLevel = result.riskLevel ?? 'safe'
  const findings = result.findings ?? []
  const summary = result.summary ?? {
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0,
    totalChecks: 0,
    passed: 0,
    warnings: 0,
    failed: 0,
  }

  const isCriticalRisk = riskLevel === 'critical' || summary.criticalCount > 0
  const isHighRisk = riskLevel === 'high' || summary.highCount > 0
  const driftDetected = findings.some(isCapabilityDriftFinding)
  const secretsDetected = findings.some(isSecretFinding)

  const blockedCategories = effectivePolicy.blockedCategories || []
  const blockedFindings = findings.filter((f) =>
    blockedCategories.some((blocked) => blocked.toLowerCase() === (f.category || '').toLowerCase())
  )

  const reasons: string[] = []
  const requiredRolesSet = new Set<Role>()

  if (blockedFindings.length > 0) {
    const blockedNames = Array.from(new Set(blockedFindings.map((f) => f.category)))
    reasons.push(`Contains findings from blocked categories: ${blockedNames.join(', ')}`)
    requiredRolesSet.add('admin')
  }

  if (isCriticalRisk) {
    reasons.push(
      `Critical risk level detected (${summary.criticalCount || 1} critical finding${
        summary.criticalCount === 1 ? '' : 's'
      }) requiring administrative override.`
    )
    if (effectivePolicy.requireAdminForCriticalRisk) {
      requiredRolesSet.add('admin')
    } else {
      requiredRolesSet.add('security-auditor')
    }
  }

  if (isHighRisk && !isCriticalRisk) {
    reasons.push(
      `High risk level detected (${summary.highCount || 1} high-severity finding${
        summary.highCount === 1 ? '' : 's'
      }) requiring security auditor review.`
    )
    if (effectivePolicy.requireAuditorForHighRisk) {
      requiredRolesSet.add('security-auditor')
    }
  }

  if (driftDetected) {
    reasons.push(
      'Capability drift detected: code execution behavior diverges from declared permissions.'
    )
    requiredRolesSet.add('security-auditor')
    if (effectivePolicy.requireComplianceForCapabilityDrift) {
      requiredRolesSet.add('compliance-officer')
    }
  }

  if (secretsDetected) {
    reasons.push('Hardcoded secrets or credentials detected in skill payload.')
    requiredRolesSet.add('security-auditor')
  }

  if (score < effectivePolicy.minScoreForAutoApproval) {
    reasons.push(
      `Overall score (${score}) is below the minimum auto-approval threshold (${effectivePolicy.minScoreForAutoApproval}).`
    )
    if (requiredRolesSet.size === 0) {
      requiredRolesSet.add('security-auditor')
    }
  }

  if (riskLevel === 'medium' && requiredRolesSet.size === 0) {
    reasons.push('Medium risk level requires security auditor review.')
    requiredRolesSet.add('security-auditor')
  }

  const isSafeOrLow = riskLevel === 'safe' || riskLevel === 'low'
  const isAutoApproved =
    score >= effectivePolicy.minScoreForAutoApproval &&
    isSafeOrLow &&
    !isCriticalRisk &&
    !isHighRisk &&
    !driftDetected &&
    !secretsDetected &&
    blockedFindings.length === 0

  if (isAutoApproved) {
    return {
      isAutoApproved: true,
      status: 'approved',
      requiredRoles: [],
      reasons: ['Skill meets all safety and quality thresholds for auto-approval.'],
    }
  }

  let status: ApprovalStatus = 'pending'
  if (requiredRolesSet.has('admin')) {
    status = 'needs_admin_override'
  } else if (
    requiredRolesSet.has('security-auditor') ||
    requiredRolesSet.has('compliance-officer')
  ) {
    status = 'needs_auditor_review'
  }

  return {
    isAutoApproved: false,
    status,
    requiredRoles: Array.from(requiredRolesSet),
    reasons,
  }
}

/**
 * Creates an ApprovalRecord tracking a multi-role approval workflow.
 */
export function createApprovalChain(
  skillId: string,
  evaluation: GovernanceEvaluation
): ApprovalRecord {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    skillId,
    status: evaluation.status,
    requiredRoles: [...evaluation.requiredRoles],
    approvals: [],
    rejections: [],
    history: [
      {
        action: evaluation.isAutoApproved ? 'auto-approved' : 'created',
        actor: 'system',
        timestamp: now,
        notes: evaluation.reasons.join('; '),
      },
    ],
  }
}

/**
 * Submits an approval or rejection decision from a reviewer with a specific Role.
 * Updates the state machine to 'approved' once all requiredRoles have submitted approvals,
 * or 'rejected' if any reviewer rejects.
 */
export function submitReview(
  record: ApprovalRecord,
  reviewer: { role: Role; name: string },
  decision: 'approve' | 'reject',
  comment?: string
): ApprovalRecord {
  const now = new Date().toISOString()

  if (record.status === 'rejected') {
    throw new Error('Cannot review an already rejected approval record')
  }

  if (record.status === 'approved') {
    throw new Error('Cannot review an already approved approval record')
  }

  if (decision === 'reject') {
    return {
      ...record,
      status: 'rejected',
      rejections: [
        ...record.rejections,
        {
          role: reviewer.role,
          reviewer: reviewer.name,
          timestamp: now,
          reason: comment || 'Rejected during review',
        },
      ],
      history: [
        ...record.history,
        {
          action: 'rejected',
          actor: reviewer.name,
          timestamp: now,
          notes: comment,
        },
      ],
    }
  }

  // Record the approval
  const newApproval = {
    role: reviewer.role,
    reviewer: reviewer.name,
    timestamp: now,
    comments: comment,
  }

  const updatedApprovals = [...record.approvals, newApproval]
  const approvedRoles = new Set(updatedApprovals.map((a) => a.role))

  // Check if all required roles have approved
  const allRolesApproved =
    record.requiredRoles.length === 0 ||
    record.requiredRoles.every((role) => approvedRoles.has(role))

  let nextStatus: ApprovalStatus
  if (allRolesApproved) {
    nextStatus = 'approved'
  } else {
    const remainingRoles = record.requiredRoles.filter((role) => !approvedRoles.has(role))
    if (remainingRoles.includes('admin')) {
      nextStatus = 'needs_admin_override'
    } else if (
      remainingRoles.includes('security-auditor') ||
      remainingRoles.includes('compliance-officer')
    ) {
      nextStatus = 'needs_auditor_review'
    } else {
      nextStatus = 'pending'
    }
  }

  return {
    ...record,
    status: nextStatus,
    approvals: updatedApprovals,
    history: [
      ...record.history,
      {
        action: 'approved',
        actor: reviewer.name,
        timestamp: now,
        notes: comment,
      },
    ],
  }
}
