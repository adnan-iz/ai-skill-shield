import type { Finding } from '@/lib/validator/types'

export type RiskDelta = 'escalated' | 'reduced' | 'unchanged'

export interface SkillDiffReport {
  skillName: string
  baseVersion?: string
  targetVersion?: string
  scoreDelta: number // target - base
  riskDelta: RiskDelta
  baseRisk: string
  targetRisk: string
  permissionEscalations: PermissionEscalation[]
  mcpToolChanges: McpToolChange[]
  findingChanges: {
    newFindings: Finding[]
    resolvedFindings: Finding[]
    unchangedFindingsCount: number
  }
  summary: string
}

export interface PermissionEscalation {
  category: 'network' | 'filesystem' | 'shell' | 'env'
  type: string
  description: string
  severity: 'critical' | 'high' | 'medium'
}

export interface McpToolChange {
  toolName: string
  changeType: 'added' | 'removed' | 'modified'
  details?: string
}
