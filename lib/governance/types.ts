export type Role = 'developer' | 'security-auditor' | 'compliance-officer' | 'admin'

export type ApprovalStatus =
  | 'pending'
  | 'needs_auditor_review'
  | 'needs_admin_override'
  | 'approved'
  | 'rejected'

export interface GovernancePolicy {
  minScoreForAutoApproval: number // e.g. 85
  requireAuditorForHighRisk: boolean
  requireAdminForCriticalRisk: boolean
  requireComplianceForCapabilityDrift: boolean
  blockedCategories: string[]
}

export interface ApprovalRecord {
  id: string
  skillId: string
  status: ApprovalStatus
  requiredRoles: Role[]
  approvals: Array<{ role: Role; reviewer: string; timestamp: string; comments?: string }>
  rejections: Array<{ role: Role; reviewer: string; timestamp: string; reason: string }>
  history: Array<{ action: string; actor: string; timestamp: string; notes?: string }>
}

export interface GovernanceEvaluation {
  isAutoApproved: boolean
  status: ApprovalStatus
  requiredRoles: Role[]
  reasons: string[]
}

export const DEFAULT_GOVERNANCE_POLICY: GovernancePolicy = {
  minScoreForAutoApproval: 85,
  requireAuditorForHighRisk: true,
  requireAdminForCriticalRisk: true,
  requireComplianceForCapabilityDrift: true,
  blockedCategories: [],
}
