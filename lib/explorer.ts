import { trustTargetForResult } from '@/lib/trust'
import type { ValidationResult } from '@/lib/validator/types'

export type TrustBand = 'trusted' | 'caution' | 'restricted'

export interface ExplorerMetaRow {
  id: string
  sourceOwner: string | null
  sourceRepo: string | null
  sourcePath: string | null
  sourceType: string | null
  skillName: string | null
  overallScore: number | null
  riskLevel: string | null
  findingsCount: number | null
  category: string | null
  description: string | null
  searchable: string | null
}

export interface ExplorerItem {
  result: ValidationResult
  owner: string
  repo: string
  path: string
  vendor: string
  category: string
  trust: TrustBand
  searchable: string
}

export interface ExplorerMetaItem {
  resultId: string
  skillName: string
  overallScore: number
  riskLevel: string
  findingsCount: number
  description: string
  owner: string
  repo: string
  path: string
  vendor: string
  category: string
  trust: TrustBand
  searchable: string
}

const CATEGORIES: [string, RegExp][] = [
  ['Security', /security|secure|audit|scanner|compliance|vulnerab|threat/],
  ['Browser Automation', /browser|chrome|playwright|scrap|crawl|website/],
  ['Data & Analytics', /data|database|sql|analytics|spreadsheet|csv/],
  ['Design & Creative', /design|image|video|audio|figma|creative/],
  ['Documents', /document|writing|pdf|slide|presentation/],
  ['DevOps', /deploy|cloud|docker|kubernetes|ci\/?cd|infrastructure/],
  ['Testing', /test|testing|debug|quality assurance|\bqa\b/],
  ['Communication', /email|slack|message|social|communication/],
]

function textValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').join(' ')
  return ''
}

export function trustBand(score: number, riskLevel: ValidationResult['riskLevel']): TrustBand {
  const scoreBand = score >= 80 ? 'trusted' : score >= 40 ? 'caution' : 'restricted'
  if (riskLevel === 'critical') return 'restricted'
  return riskLevel === 'high' && scoreBand === 'trusted' ? 'caution' : scoreBand
}

export function explorerItem(result: ValidationResult): ExplorerItem | null {
  const target = trustTargetForResult(result)
  if (!target) return null

  const frontmatter = result.skillPreview.frontmatter
  const metadata = typeof frontmatter.metadata === 'object' && frontmatter.metadata !== null
    ? frontmatter.metadata as Record<string, unknown>
    : {}
  const declaredCategory = textValue(metadata.category || frontmatter.category).trim()
  const categoryText = `${result.skillName} ${target.path} ${textValue(frontmatter.tags)} ${result.source?.repositoryMeta?.description || ''}`.toLowerCase()
  const category = declaredCategory || CATEGORIES.find(([, pattern]) => pattern.test(categoryText))?.[0] || 'Developer Tools'
  const searchable = `${target.owner} ${target.repo} ${target.path} ${result.skillName} ${category} ${result.source?.repositoryMeta?.description || ''}`.toLowerCase()

  return {
    result,
    ...target,
    vendor: target.owner,
    category,
    trust: trustBand(result.overallScore, result.riskLevel),
    searchable,
  }
}

export function explorerItems(results: ValidationResult[]): ExplorerItem[] {
  return results.flatMap((result) => {
    const item = explorerItem(result)
    return item ? [item] : []
  })
}

export function explorerItemFromMeta(row: ExplorerMetaRow): ExplorerMetaItem | null {
  if (!row.sourceOwner || !row.sourceRepo || row.sourceType !== 'github') return null

  const score = row.overallScore ?? 0
  const rl = (row.riskLevel ?? 'safe') as ValidationResult['riskLevel']

  return {
    resultId: row.id,
    skillName: row.skillName || '',
    overallScore: score,
    riskLevel: row.riskLevel || 'safe',
    findingsCount: row.findingsCount ?? 0,
    description: row.description || '',
    owner: row.sourceOwner,
    repo: row.sourceRepo,
    path: row.sourcePath || '',
    vendor: row.sourceOwner,
    category: row.category || 'Developer Tools',
    trust: trustBand(score, rl),
    searchable: row.searchable || '',
  }
}

