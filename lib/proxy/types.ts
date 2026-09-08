export interface McpCallRequest {
  id?: string | number
  method: 'tools/call' | 'tools/list' | string
  params?: {
    name: string
    arguments?: Record<string, unknown>
  }
}

export interface ProxyDecision {
  action: 'allow' | 'block' | 'sanitize'
  reason?: string
  riskLevel: 'critical' | 'high' | 'medium' | 'safe'
  modifiedArguments?: Record<string, unknown>
  violations: string[]
}

export interface ProxyPolicy {
  blockedTools?: string[]
  allowedDirectories?: string[]
  blockedDomains?: string[]
  enforcePermissionManifest?: boolean
  dlpInspectArgs?: boolean // inspect for secrets/passwords in arguments
  dlpAction?: 'sanitize' | 'block'
}
