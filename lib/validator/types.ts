import type { RepositoryAudit } from '@/lib/github/repository-audit'

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface SkillSource {
  type: 'github' | 'upload' | 'paste' | 'url'
  url?: string
  owner?: string
  repo?: string
  path?: string
  branch?: string
  sha?: string
  repositoryAudit?: RepositoryAudit
  repositoryMeta?: RepositoryMeta
}

export interface SkillInput {
  name?: string
  files: SkillFile[]
  directoryName?: string
  source?: SkillSource
}

export interface SkillFile {
  path: string
  content: string
}

export interface ValidationResult {
  id: string
  timestamp: string
  skillName: string
  overallScore: number
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe'
  summary: ValidationSummary
  axes: AxisResult[]
  findings: Finding[]
  compatibility: CompatibilityMatrix
  tokenAnalysis: TokenAnalysis
  skillPreview: SkillPreview
  source?: SkillSource
}

export interface ValidationSummary {
  totalChecks: number
  passed: number
  warnings: number
  failed: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  infoCount: number
}

export interface AxisResult {
  name: string
  key: string
  score: number
  status: 'pass' | 'warn' | 'fail'
  summary: string
  findings: Finding[]
}

export interface Finding {
  id: string
  axis: string
  severity: Severity
  category: string
  title: string
  message: string
  filePath?: string
  lineNumber?: number
  column?: number
  snippet?: string
  recommendation?: string
  ruleId?: string
}

export interface CompatibilityMatrix {
  agents: AgentCompatibility[]
  overallCompatibility: number
}

export interface AgentCompatibility {
  name: string
  id: string
  status: 'full' | 'partial' | 'unknown' | 'incompatible'
  notes?: string
}

export interface TokenAnalysis {
  totalTokens: number
  frontmatterTokens: number
  bodyTokens: number
  isUnderLimit: boolean
  limit: number
  breakdown: TokenBreakdownItem[]
}

export interface TokenBreakdownItem {
  section: string
  tokens: number
}

export interface SkillPreview {
  frontmatter: Record<string, unknown>
  body: string
  renderedHtml?: string
  fileTree: FileTreeItem[]
}

export interface RepositoryMeta {
  fullName: string
  description?: string
  isPrivate?: boolean
  stars: number
  forks: number
  openIssues: number
  archived: boolean
  defaultBranch?: string
  isDefaultBranchHead?: boolean
  updatedAt?: string
  pushedAt?: string
  license?: string
}

export interface FileTreeItem {
  path: string
  type: 'file' | 'directory'
  size: number
  children?: FileTreeItem[]
}

export type ValidationAxis =
  | 'frontmatter'
  | 'structure'
  | 'naming'
  | 'security'
  | 'quality'
  | 'content'
  | 'tokens'
  | 'compatibility'
  | 'dependencies'
  | 'installation'
  | 'bestPractices'
