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
import { normalizeValidationResult } from '@/lib/validator/normalize-result'
import {
  SkillFile, SkillInput, SkillPreview, FileTreeItem,
  ValidationResult, ValidationSummary, Finding, AxisResult,
  CompatibilityMatrix,
} from '@/lib/validator/types'
export interface OrchestratorOptions {
  id?: string
  source?: SkillInput['source']
  rescan?: boolean
}

const AXIS_WEIGHTS: Record<string, number> = {
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

const TOTAL_AXIS_WEIGHT = Object.values(AXIS_WEIGHTS).reduce((sum, weight) => sum + weight, 0)

export function calculateOverallScore(axes: AxisResult[]): number {
  const weightedScore = axes.reduce(
    (sum, axis) => sum + axis.score * (AXIS_WEIGHTS[axis.key] || 0),
    0
  )
  return Math.round(weightedScore / TOTAL_AXIS_WEIGHT)
}

function finalizeValidationResult(result: ValidationResult): ValidationResult {
  const normalized = normalizeValidationResult(result)
  return {
    ...normalized,
    overallScore: calculateOverallScore(normalized.axes),
    riskLevel: determineRiskLevel(normalized.findings),
  }
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
  const unknownCount = result.agents.filter(a => a.status === 'unknown').length
  const totalKnown = fullCount + partialCount

  let score: number
  let status: AxisResult['status']
  let summary: string

  if (totalKnown > 0) {
    score = result.overallCompatibility
    status = score >= 70 ? 'pass' : score >= 40 ? 'warn' : 'fail'
    summary = `Explicit markers: ${fullCount} full, ${partialCount} partial; ${unknownCount} unverified`
  } else {
    score = 0
    status = 'fail'
    summary = 'No agent-specific runtime markers detected'
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

  return { name: 'Agent Compatibility', key: 'compatibility', score, status, summary, findings }
}

async function runAllSkillValidation(
  input: SkillInput,
  skillFiles: SkillFile[],
  options?: OrchestratorOptions
): Promise<ValidationResult> {
  const validated = await Promise.all(skillFiles.map(async (skillFile) => {
    const normalizedPath = skillFile.path.replace(/\\/g, '/')
    const directory = normalizedPath.split('/').slice(0, -1).join('/')
    const source = input.source ? { ...input.source, path: directory } : undefined
    const result = await runFullValidation({
      files: [{ path: 'SKILL.md', content: skillFile.content }],
      directoryName: directory.split('/').pop(),
      source,
      analyzeAllSkills: false,
    }, { source })

    return { path: normalizedPath, result }
  }))

  const findings = validated.flatMap(({ path, result }, skillIndex) =>
    result.findings.map((finding) => ({
      ...finding,
      id: `skill-${skillIndex}-${finding.id}`,
      filePath: !finding.filePath || finding.filePath === 'SKILL.md'
        ? path
        : `${path.slice(0, -'SKILL.md'.length)}${finding.filePath}`,
    }))
  )

  const axes = validated[0].result.axes.map((firstAxis) => {
    const matching = validated.map(({ result }) => result.axes.find((axis) => axis.key === firstAxis.key) || firstAxis)
    const score = Math.round(matching.reduce((sum, axis) => sum + axis.score, 0) / matching.length)
    const status: AxisResult['status'] = matching.some((axis) => axis.status === 'fail')
      ? 'fail'
      : matching.some((axis) => axis.status === 'warn')
      ? 'warn'
      : 'pass'

    return {
      name: firstAxis.name,
      key: firstAxis.key,
      score,
      status,
      summary: `${matching.filter((axis) => axis.status === 'pass').length}/${matching.length} skills passed; ${score}/100 average`,
      findings: [],
    }
  })

  const riskLevel = determineRiskLevel(findings)
  const overallScore = calculateOverallScore(axes)

  const baseName = input.name || input.source?.repositoryMeta?.fullName || 'Repository'
  const totalTokens = validated.reduce((sum, { result }) => sum + result.tokenAnalysis.totalTokens, 0)
  const totalLimit = validated.reduce((sum, { result }) => sum + result.tokenAnalysis.limit, 0)

  return finalizeValidationResult({
    id: options?.id || uuidv4(),
    timestamp: new Date().toISOString(),
    skillName: `${baseName} (${validated.length} skills)`,
    overallScore,
    riskLevel,
    summary: buildSummary(findings, axes),
    axes,
    findings,
    compatibility: validated[0].result.compatibility,
    tokenAnalysis: {
      totalTokens,
      frontmatterTokens: validated.reduce((sum, { result }) => sum + result.tokenAnalysis.frontmatterTokens, 0),
      bodyTokens: validated.reduce((sum, { result }) => sum + result.tokenAnalysis.bodyTokens, 0),
      isUnderLimit: totalTokens <= totalLimit,
      limit: totalLimit,
      breakdown: validated.map(({ path, result }) => ({ section: path, tokens: result.tokenAnalysis.totalTokens })),
    },
    skillPreview: {
      frontmatter: { batch: true, skillCount: validated.length },
      body: `Analyzed ${validated.length} SKILL.md files independently. See the skill results and findings above.`,
      fileTree: buildFileTree(skillFiles),
    },
    source: options?.source || input.source,
    batch: {
      totalSkills: validated.length,
      results: validated.map(({ path, result }) => ({
        path,
        skillName: result.skillName,
        overallScore: result.overallScore,
        riskLevel: result.riskLevel,
        findingsCount: result.findings.length,
        criticalCount: result.summary.criticalCount,
        highCount: result.summary.highCount,
      })),
    },
  })
}

export async function runFullValidation(
  input: SkillInput,
  options?: OrchestratorOptions
): Promise<ValidationResult> {
  const skillFiles = input.files.filter((file) => /(^|\/)SKILL\.md$/i.test(file.path.replace(/\\/g, '/')))
  if (input.analyzeAllSkills && skillFiles.length > 1) {
    return runAllSkillValidation(input, skillFiles, options)
  }

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

  const overallScore = calculateOverallScore(axes)
  const riskLevel = determineRiskLevel(allFindings)
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

  return finalizeValidationResult(result)
}
