import { v4 as uuidv4 } from 'uuid'
import { parseFrontmatter } from '@/lib/parser/frontmatter'
import { validateFrontmatter } from '@/lib/validator/frontmatter'
import { validateStructure } from '@/lib/validator/structure'
import { validateNaming } from '@/lib/validator/naming'
import { runSecurityScan } from '@/lib/scanner/security'
import { assessQuality } from '@/lib/validator/quality'
import { validateTokens, analyzeTokens } from '@/lib/validator/tokens'
import { detectCompatibility } from '@/lib/validator/compatibility'
import { validateContent } from '@/lib/validator/content'
import { validateDependencies } from '@/lib/validator/dependencies'
import { validateBestPractices } from '@/lib/validator/best-practices'
import { validateInstallation } from '@/lib/validator/installation'
import {
  SkillFile, SkillInput, SkillPreview, FileTreeItem,
  ValidationResult, ValidationSummary, Finding, AxisResult,
  CompatibilityMatrix,
} from '@/lib/validator/types'
export interface OrchestratorOptions {
  id?: string
  source?: SkillInput['source']
}

function buildFileTree(files: SkillFile[]): FileTreeItem[] {
  const tree: FileTreeItem[] = []
  const dirMap = new Map<string, FileTreeItem>()

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path))

  for (const file of sorted) {
    const normalizedPath = file.path.replace(/\\/g, '/')
    const parts = normalizedPath.split('/')

    let currentPath = ''
    let currentLevel = tree

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part

      if (i === parts.length - 1) {
        currentLevel.push({
          path: currentPath,
          type: 'file',
          size: file.content.length,
        })
      } else {
        let existing = dirMap.get(currentPath)
        if (!existing) {
          existing = {
            path: currentPath,
            type: 'directory',
            size: 0,
            children: [],
          }
          dirMap.set(currentPath, existing)
          currentLevel.push(existing)
        }
        currentLevel = existing.children!
      }
    }
  }

  return tree
}

export function determineRiskLevel(findings: Finding[]): ValidationResult['riskLevel'] {
  for (const f of findings) {
    if (f.severity === 'critical') return 'critical'
  }
  for (const f of findings) {
    if (f.severity === 'high') return 'high'
  }
  for (const f of findings) {
    if (f.severity === 'medium') return 'medium'
  }
  for (const f of findings) {
    if (f.severity === 'low') return 'low'
  }
  return 'safe'
}

function buildSummary(findings: Finding[], axes: AxisResult[]): ValidationSummary {
  const summary: ValidationSummary = {
    totalChecks: axes.length,
    passed: 0,
    warnings: 0,
    failed: 0,
    criticalCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    infoCount: 0,
  }

  for (const f of findings) {
    switch (f.severity) {
      case 'critical': summary.criticalCount++; break
      case 'high': summary.highCount++; break
      case 'medium': summary.mediumCount++; break
      case 'low': summary.lowCount++; break
      case 'info': summary.infoCount++; break
    }
  }

  for (const axis of axes) {
    if (axis.status === 'pass') summary.passed++
    else if (axis.status === 'warn') summary.warnings++
    else if (axis.status === 'fail') summary.failed++
  }

  return summary
}

function buildCompatibilityAxis(result: CompatibilityMatrix): AxisResult {
  const fullCount = result.agents.filter(a => a.status === 'full').length
  const partialCount = result.agents.filter(a => a.status === 'partial').length
  const _unknownCount = result.agents.filter(a => a.status === 'unknown').length
  const totalKnown = fullCount + partialCount
  const ratio = totalKnown / result.agents.length

  let score: number
  let status: AxisResult['status']
  let summary: string

  if (ratio >= 0.5) {
    score = 80 + Math.round((fullCount / result.agents.length) * 20)
    status = 'pass'
    summary = `Compatible with ${totalKnown}/${result.agents.length} agents (${fullCount} full, ${partialCount} partial)`
  } else if (ratio >= 0.2) {
    score = 40 + Math.round(ratio * 40)
    status = 'warn'
    summary = `Limited compatibility: ${totalKnown}/${result.agents.length} agents detected`
  } else {
    score = Math.round(ratio * 40)
    status = 'fail'
    summary = `Low compatibility: only ${totalKnown}/${result.agents.length} agents detected`
  }

  const findings: Finding[] = []

  const unknownNames = result.agents.filter(a => a.status === 'unknown').map(a => a.name)
  if (unknownNames.length > 0 && unknownNames.length < result.agents.length) {
    findings.push({
      id: `compat-unknown-${Date.now()}`,
      axis: 'compatibility',
      severity: 'info',
      category: 'Compatibility',
      title: 'Undetected agents',
      message: `No compatibility data for: ${unknownNames.join(', ')}`,
      recommendation: 'Add agent-specific instructions or detection markers if these agents should be supported',
    })
  }

  if (unknownNames.length === result.agents.length) {
    findings.push({
      id: `compat-none-${Date.now()}`,
      axis: 'compatibility',
      severity: 'medium',
      category: 'Compatibility',
      title: 'No agent compatibility detected',
      message: 'The skill does not reference any known agent. Add agent-specific instructions or configuration files.',
      recommendation: 'Include agent-specific tags, tool calls, or configuration files (.cursor/, .claude/, .opencode/, etc.)',
    })
  }

  if (unknownNames.length > 0 && unknownNames.length === result.agents.length) {
    score = 0
    status = 'fail'
    summary = 'No agent compatibility detected'
  }

  return { name: 'Agent Compatibility', key: 'compatibility', score, status, summary, findings }
}

export async function runFullValidation(
  input: SkillInput,
  options?: OrchestratorOptions
): Promise<ValidationResult> {
  const skillFile = input.files.find(f =>
    f.path.replace(/\\/g, '/').endsWith('SKILL.md')
  )

  let content = ''
  let frontmatter: Record<string, unknown> = {}
  let body = ''

  if (skillFile) {
    content = skillFile.content
    const parsed = parseFrontmatter(content)
    frontmatter = parsed.frontmatter
    body = parsed.body
  }

  const skillName = input.name || (frontmatter.name as string) || 'unnamed-skill'

  const [
    frontmatterResult,
    structureResult,
    namingResult,
    securityResult,
    qualityResult,
    tokenAxisResult,
    tokenAnalysisData,
    compatibilityResult,
    contentResult,
    dependencyResult,
    bestPracticesResult,
    installationResult,
  ] = await Promise.all([
    Promise.resolve(validateFrontmatter(frontmatter)),
    Promise.resolve(validateStructure(input.files)),
    Promise.resolve(validateNaming(skillName, { directoryName: input.directoryName })),
    Promise.resolve(runSecurityScan(input.files, content)),
    Promise.resolve(assessQuality(content, body)),
    Promise.resolve(validateTokens(content, frontmatter, body)),
    Promise.resolve(analyzeTokens(content, frontmatter, body)),
    Promise.resolve(detectCompatibility(content, input.files)),
    Promise.resolve(validateContent(content)),
    Promise.resolve(validateDependencies(content)),
    Promise.resolve(validateBestPractices(content)),
    Promise.resolve(validateInstallation(input.files)),
  ])

  const compatibilityAxisResult = buildCompatibilityAxis(compatibilityResult)

  const axes: AxisResult[] = [
    frontmatterResult,
    structureResult,
    namingResult,
    securityResult,
    qualityResult,
    tokenAxisResult,
    compatibilityAxisResult,
    contentResult,
    dependencyResult,
    installationResult,
    bestPracticesResult,
  ]

  const allFindings = axes.flatMap(a => a.findings)

  const weights: Record<string, number> = {
    security: 0.25,
    frontmatter: 0.18,
    quality: 0.12,
    structure: 0.10,
    naming: 0.05,
    tokens: 0.05,
    compatibility: 0.05,
    content: 0.05,
    dependencies: 0.03,
    installation: 0.07,
    bestPractices: 0.02,
  }

  let overallScore = 0
  for (const axis of axes) {
    const weight = weights[axis.key] || 0
    overallScore += axis.score * weight
  }
  overallScore = Math.round(overallScore)

  const riskLevel = determineRiskLevel(allFindings)
  if (riskLevel === 'critical') overallScore = Math.min(overallScore, 60)
  if (riskLevel === 'high') overallScore = Math.min(overallScore, 74)
  const summary = buildSummary(allFindings, axes)
  const fileTree = buildFileTree(input.files)

  const skillPreview: SkillPreview = {
    frontmatter,
    body,
    fileTree,
  }

  const result: ValidationResult = {
    id: options?.id || uuidv4(),
    timestamp: new Date().toISOString(),
    skillName,
    overallScore,
    riskLevel,
    summary,
    axes,
    findings: allFindings,
    compatibility: compatibilityResult,
    tokenAnalysis: tokenAnalysisData,
    skillPreview,
    source: options?.source || input.source,
  }

  return result
}
