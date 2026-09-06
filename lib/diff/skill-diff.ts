import type { ValidationResult, SkillFile, Finding } from '@/lib/validator/types'
import { extractPermissionManifest, type PermissionManifest } from '@/lib/permissions/manifest'
import { parseFrontmatter } from '@/lib/parser/frontmatter'
import { extractMcpToolsFromContent, type McpToolDefinition } from '@/lib/mcp/schema-scanner'
import type { SkillDiffReport, PermissionEscalation, McpToolChange, RiskDelta } from './types'

const RISK_RANKS: Record<string, number> = {
  safe: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

const NETWORK_PATTERNS = [
  /\b(?:fetch\s*\(|axios\.(?:get|post|put|delete|request)|https?\.request\b|net\.connect\b|new\s+WebSocket\b)/,
  /\b(?:requests\.(?:get|post|put|delete)|urllib\.request|aiohttp\.ClientSession|httpx\.(?:get|post|Client))\b/,
  /\b(?:curl|wget)\s+['"]?https?:\/\//i,
]

const SHELL_PATTERNS = [
  /\b(?:child_process\.(?:exec|execSync|spawn|spawnSync|fork)|require\s*\(['"]child_process['"]\))/,
  /\b(?:subprocess\.(?:run|Popen|check_output|call)|os\.system\b|os\.popen\b)/,
  /\b(?:eval\s*\(|new\s+Function\s*\()/,
]

const DESTRUCTIVE_COMMAND_PATTERNS = [
  /\b(?:rm\s+-(?:rf?|fr?)|mkfs|dd\s+if=|shred|truncate\s+-s|format\s+[a-z]:|chmod\s+-R\s+777)\b/i,
  /:()\s*\{\s*:\|:&\s*\};:/,
]

const FS_WRITE_PATTERNS = [
  /\b(?:fs\.(?:writeFile|writeFileSync|appendFile|appendFileSync|unlink|unlinkSync|rm|rmSync|rmdir|rmdirSync|createWriteStream))\b/,
  /\b(?:open\s*\([^)]*['"][wa+][a-z]*['"]|os\.(?:remove|unlink|rmdir)|shutil\.(?:rmtree|copy|move))\b/,
]

const SENSITIVE_ENV_REGEX = /(?:process\.env(?:\.([A-Z0-9_]+)|\[['"]([A-Z0-9_]+)['"]\])|os\.(?:environ\.get|environ)\[?['"]([A-Z0-9_]+)['"]?\]?|\$([A-Z0-9_]+))/g
const SENSITIVE_KEYWORD_REGEX = /(?:TOKEN|SECRET|KEY|PASSWORD|AUTH|CREDENTIAL|PRIVATE|DATABASE_URL|ACCESS_KEY)/i

const GENERAL_ENV_REGEX = /(?:process\.env(?:\.([a-zA-Z0-9_]+)|\[['"]([a-zA-Z0-9_]+)['"]\])|os\.(?:environ\.get|environ)\[?['"]([a-zA-Z0-9_]+)['"]?\]?)/g

function findingKey(f: Finding): string {
  const file = f.filePath || ''
  const ruleOrCat = f.ruleId || f.category
  const loc = f.lineNumber ?? ''
  const snip = (f.snippet || '').trim().slice(0, 50)
  return `${ruleOrCat}:::${f.title}:::${file}:::${loc}:::${snip}`
}

function resolveEffectiveFiles(result: ValidationResult, files?: SkillFile[]): SkillFile[] {
  if (files && files.length > 0) {
    return files
  }
  if (result.skillPreview?.files && result.skillPreview.files.length > 0) {
    return result.skillPreview.files.map((f) => ({ path: f.path, content: f.content }))
  }
  if (result.skillPreview?.body) {
    return [{ path: 'SKILL.md', content: result.skillPreview.body }]
  }
  return []
}

function extractVersion(result: ValidationResult, files: SkillFile[]): string | undefined {
  if (result.skillPreview?.frontmatter?.version && typeof result.skillPreview.frontmatter.version === 'string') {
    return result.skillPreview.frontmatter.version
  }
  for (const file of files) {
    const manifest = extractPermissionManifest(file.content)
    if (manifest?.version) return manifest.version
    const fm = parseFrontmatter(file.content)
    if (fm.frontmatter?.version && typeof fm.frontmatter.version === 'string') {
      return fm.frontmatter.version
    }
  }
  return undefined
}

function extractManifests(files: SkillFile[]): PermissionManifest[] {
  const manifests: PermissionManifest[] = []
  for (const file of files) {
    const manifest = extractPermissionManifest(file.content)
    if (manifest) {
      manifests.push(manifest)
    }
  }
  return manifests
}

function hasNetworkCapability(files: SkillFile[], findings: Finding[], manifests: PermissionManifest[]): boolean {
  for (const manifest of manifests) {
    if (manifest.permissions?.network?.allow && manifest.permissions.network.allow.length > 0) {
      return true
    }
  }

  for (const file of files) {
    for (const pattern of NETWORK_PATTERNS) {
      if (pattern.test(file.content)) return true
    }
  }

  for (const f of findings) {
    if (
      f.category === 'network' ||
      f.ruleId === 'SS-DRIFT-NET' ||
      f.category === 'capability-drift' && /network/i.test(f.title + ' ' + f.message) ||
      /\b(network|http|fetch|socket)\b/i.test(f.title)
    ) {
      return true
    }
  }

  return false
}

function hasUndeclaredNetworkActivity(files: SkillFile[], findings: Finding[], manifests: PermissionManifest[]): boolean {
  for (const f of findings) {
    if (f.ruleId === 'SS-DRIFT-NET' || (f.category === 'capability-drift' && /network/i.test(f.title))) {
      return true
    }
    if (f.category === 'network' && /undeclared|unauthorized|denied/i.test(f.title + ' ' + f.message)) {
      return true
    }
  }

  const hasExplicitNetwork = manifests.some((m) => m.permissions?.network?.allow && m.permissions.network.allow.length > 0)
  if (!hasExplicitNetwork) {
    for (const file of files) {
      for (const pattern of NETWORK_PATTERNS) {
        if (pattern.test(file.content)) return true
      }
    }
  }

  return false
}

function hasShellCapability(files: SkillFile[], findings: Finding[], manifests: PermissionManifest[]): boolean {
  for (const manifest of manifests) {
    if (manifest.permissions?.shell?.allow && manifest.permissions.shell.allow.length > 0) {
      return true
    }
  }

  for (const file of files) {
    for (const pattern of SHELL_PATTERNS) {
      if (pattern.test(file.content)) return true
    }
    for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
      if (pattern.test(file.content)) return true
    }
  }

  for (const f of findings) {
    if (
      f.category === 'shell-execution' ||
      f.category === 'command-injection' ||
      f.ruleId === 'SS-DRIFT-EXEC' ||
      /\b(shell|exec|subprocess|child_process|eval)\b/i.test(f.title)
    ) {
      return true
    }
  }

  return false
}

function hasDestructiveCommands(files: SkillFile[], findings: Finding[]): boolean {
  for (const file of files) {
    for (const pattern of DESTRUCTIVE_COMMAND_PATTERNS) {
      if (pattern.test(file.content)) return true
    }
  }

  for (const f of findings) {
    if (/destructive|rm\s+-rf|format\s+|mkfs|shred/i.test(f.title + ' ' + f.message)) {
      return true
    }
  }

  return false
}

function hasFilesystemWriteCapability(files: SkillFile[], findings: Finding[], manifests: PermissionManifest[]): boolean {
  for (const manifest of manifests) {
    if (manifest.permissions?.filesystem?.write && manifest.permissions.filesystem.write.length > 0) {
      return true
    }
  }

  for (const file of files) {
    for (const pattern of FS_WRITE_PATTERNS) {
      if (pattern.test(file.content)) return true
    }
  }

  for (const f of findings) {
    if (
      f.category === 'filesystem-write' ||
      f.ruleId === 'SS-DRIFT-FS' ||
      /\b(filesystem write|write|unlink|delete file)\b/i.test(f.title)
    ) {
      return true
    }
  }

  return false
}

function extractFilesystemPaths(files: SkillFile[], manifests: PermissionManifest[]): Set<string> {
  const paths = new Set<string>()
  for (const manifest of manifests) {
    for (const p of manifest.permissions?.filesystem?.read || []) paths.add(p)
    for (const p of manifest.permissions?.filesystem?.write || []) paths.add(p)
  }
  return paths
}

function extractEnvVars(files: SkillFile[]): { sensitive: Set<string>; all: Set<string> } {
  const sensitive = new Set<string>()
  const all = new Set<string>()

  for (const file of files) {
    SENSITIVE_ENV_REGEX.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = SENSITIVE_ENV_REGEX.exec(file.content)) !== null) {
      const varName = match[1] || match[2] || match[3] || match[4]
      if (varName) {
        all.add(varName)
        if (SENSITIVE_KEYWORD_REGEX.test(varName)) {
          sensitive.add(varName)
        }
      }
    }

    GENERAL_ENV_REGEX.lastIndex = 0
    while ((match = GENERAL_ENV_REGEX.exec(file.content)) !== null) {
      const varName = match[1] || match[2] || match[3]
      if (varName) {
        all.add(varName)
        if (SENSITIVE_KEYWORD_REGEX.test(varName)) {
          sensitive.add(varName)
        }
      }
    }
  }

  return { sensitive, all }
}

function detectPermissionEscalations(
  baseFiles: SkillFile[],
  targetFiles: SkillFile[],
  baseResult: ValidationResult,
  targetResult: ValidationResult
): PermissionEscalation[] {
  const escalations: PermissionEscalation[] = []

  const baseManifests = extractManifests(baseFiles)
  const targetManifests = extractManifests(targetFiles)

  const baseNetwork = hasNetworkCapability(baseFiles, baseResult.findings || [], baseManifests)
  const targetNetwork = hasNetworkCapability(targetFiles, targetResult.findings || [], targetManifests)
  const targetUndeclaredNet = hasUndeclaredNetworkActivity(targetFiles, targetResult.findings || [], targetManifests)
  const baseUndeclaredNet = hasUndeclaredNetworkActivity(baseFiles, baseResult.findings || [], baseManifests)

  if (!baseNetwork && targetNetwork) {
    escalations.push({
      category: 'network',
      type: 'network-access-introduced',
      description: targetUndeclaredNet
        ? 'Target introduces undeclared network communication capabilities when base version had none.'
        : 'Target introduces outbound network communication capabilities where base version had none.',
      severity: targetUndeclaredNet ? 'critical' : 'high',
    })
  } else if (!baseUndeclaredNet && targetUndeclaredNet) {
    escalations.push({
      category: 'network',
      type: 'undeclared-network-introduced',
      description: 'Target introduces undeclared network calls without declared manifest authorization.',
      severity: 'critical',
    })
  }

  const baseShell = hasShellCapability(baseFiles, baseResult.findings || [], baseManifests)
  const targetShell = hasShellCapability(targetFiles, targetResult.findings || [], targetManifests)
  const baseDestructive = hasDestructiveCommands(baseFiles, baseResult.findings || [])
  const targetDestructive = hasDestructiveCommands(targetFiles, targetResult.findings || [])

  if (targetDestructive && !baseDestructive) {
    escalations.push({
      category: 'shell',
      type: 'destructive-command-introduced',
      description: 'Target introduces destructive shell commands (e.g. rm -rf, mkfs, dd).',
      severity: 'critical',
    })
  }

  if (!baseShell && targetShell && !targetDestructive) {
    escalations.push({
      category: 'shell',
      type: 'shell-execution-introduced',
      description: 'Target introduces shell command execution or process spawning capabilities when base version had none.',
      severity: 'critical',
    })
  } else if (!baseShell && targetShell && targetDestructive) {
    // Both shell introduced and destructive commands present
    // Destructive command escalation was already pushed as critical
  }

  const baseFsWrite = hasFilesystemWriteCapability(baseFiles, baseResult.findings || [], baseManifests)
  const targetFsWrite = hasFilesystemWriteCapability(targetFiles, targetResult.findings || [], targetManifests)

  if (!baseFsWrite && targetFsWrite) {
    escalations.push({
      category: 'filesystem',
      type: 'filesystem-write-introduced',
      description: 'Target introduces filesystem write or deletion operations where base version was restricted or read-only.',
      severity: 'high',
    })
  }

  const basePaths = extractFilesystemPaths(baseFiles, baseManifests)
  const targetPaths = extractFilesystemPaths(targetFiles, targetManifests)
  const newPaths = [...targetPaths].filter((p) => !basePaths.has(p))

  if (basePaths.size > 0 && newPaths.length > 0) {
    escalations.push({
      category: 'filesystem',
      type: 'filesystem-scope-broadened',
      description: `Target broadens filesystem access to new paths: ${newPaths.join(', ')}.`,
      severity: 'high',
    })
  }

  const baseEnv = extractEnvVars(baseFiles)
  const targetEnv = extractEnvVars(targetFiles)
  const newSensitiveVars = [...targetEnv.sensitive].filter((v) => !baseEnv.sensitive.has(v))

  if (newSensitiveVars.length > 0) {
    escalations.push({
      category: 'env',
      type: 'sensitive-env-access',
      description: `Target accesses new sensitive environment variable(s): ${newSensitiveVars.join(', ')}.`,
      severity: 'high',
    })
  } else {
    // Check findings for sensitive env
    const baseHasEnvFinding = (baseResult.findings || []).some(
      (f) => f.category === 'sensitive-env' || /sensitive.*env/i.test(f.title)
    )
    const targetHasEnvFinding = (targetResult.findings || []).some(
      (f) => f.category === 'sensitive-env' || /sensitive.*env/i.test(f.title)
    )
    if (!baseHasEnvFinding && targetHasEnvFinding) {
      escalations.push({
        category: 'env',
        type: 'sensitive-env-access',
        description: 'Target introduces access to sensitive environment variables or secrets.',
        severity: 'high',
      })
    }
  }

  return escalations
}

function detectMcpToolChanges(baseFiles: SkillFile[], targetFiles: SkillFile[]): McpToolChange[] {
  const baseTools = new Map<string, McpToolDefinition>()
  for (const file of baseFiles) {
    const tools = extractMcpToolsFromContent(file.content)
    for (const tool of tools) {
      if (tool.name && !baseTools.has(tool.name)) {
        baseTools.set(tool.name, tool)
      }
    }
  }

  const targetTools = new Map<string, McpToolDefinition>()
  for (const file of targetFiles) {
    const tools = extractMcpToolsFromContent(file.content)
    for (const tool of tools) {
      if (tool.name && !targetTools.has(tool.name)) {
        targetTools.set(tool.name, tool)
      }
    }
  }

  const changes: McpToolChange[] = []

  // Added tools
  for (const [name, tool] of targetTools.entries()) {
    if (!baseTools.has(name)) {
      changes.push({
        toolName: name,
        changeType: 'added',
        details: tool.description ? `Added tool: "${tool.description}"` : 'Newly declared MCP tool',
      })
    }
  }

  // Removed tools
  for (const [name] of baseTools.entries()) {
    if (!targetTools.has(name)) {
      changes.push({
        toolName: name,
        changeType: 'removed',
        details: 'MCP tool removed in target version',
      })
    }
  }

  // Modified tools
  for (const [name, targetTool] of targetTools.entries()) {
    const baseTool = baseTools.get(name)
    if (!baseTool) continue

    const modifications: string[] = []

    const baseProps = baseTool.inputSchema?.properties || {}
    const targetProps = targetTool.inputSchema?.properties || {}
    const basePropKeys = Object.keys(baseProps)
    const targetPropKeys = Object.keys(targetProps)

    const addedParams = targetPropKeys.filter((k) => !baseProps[k])
    const removedParams = basePropKeys.filter((k) => !targetProps[k])
    const alteredParams: string[] = []

    for (const k of targetPropKeys) {
      if (baseProps[k]) {
        const bp = baseProps[k]
        const tp = targetProps[k]
        if (bp.type !== tp.type) {
          alteredParams.push(`${k} (type ${bp.type || 'unknown'} -> ${tp.type || 'unknown'})`)
        } else if (bp.description !== tp.description) {
          alteredParams.push(`${k} (description modified)`)
        } else if (bp.pattern !== tp.pattern || bp.maxLength !== tp.maxLength) {
          alteredParams.push(`${k} (validation constraints modified)`)
        }
      }
    }

    if (addedParams.length > 0) modifications.push(`added parameter(s): ${addedParams.join(', ')}`)
    if (removedParams.length > 0) modifications.push(`removed parameter(s): ${removedParams.join(', ')}`)
    if (alteredParams.length > 0) modifications.push(`modified parameter schema: ${alteredParams.join(', ')}`)

    const baseReq = baseTool.inputSchema?.required || []
    const targetReq = targetTool.inputSchema?.required || []
    if (JSON.stringify(baseReq.slice().sort()) !== JSON.stringify(targetReq.slice().sort())) {
      modifications.push(`required parameters changed from [${baseReq.join(', ')}] to [${targetReq.join(', ')}]`)
    }

    if (baseTool.description !== targetTool.description && baseTool.description && targetTool.description) {
      modifications.push('tool description modified')
    }

    if (modifications.length > 0) {
      changes.push({
        toolName: name,
        changeType: 'modified',
        details: modifications.join('; '),
      })
    }
  }

  return changes
}

function diffFindings(baseFindings: Finding[], targetFindings: Finding[]): {
  newFindings: Finding[]
  resolvedFindings: Finding[]
  unchangedFindingsCount: number
} {
  const baseMap = new Map<string, Finding[]>()
  for (const f of baseFindings) {
    const key = findingKey(f)
    const list = baseMap.get(key) || []
    list.push(f)
    baseMap.set(key, list)
  }

  const targetMap = new Map<string, Finding[]>()
  for (const f of targetFindings) {
    const key = findingKey(f)
    const list = targetMap.get(key) || []
    list.push(f)
    targetMap.set(key, list)
  }

  const newFindings: Finding[] = []
  const resolvedFindings: Finding[] = []
  let unchangedFindingsCount = 0

  for (const [key, tList] of targetMap.entries()) {
    const bList = baseMap.get(key)
    if (!bList) {
      newFindings.push(...tList)
    } else {
      const matchCount = Math.min(tList.length, bList.length)
      unchangedFindingsCount += matchCount
      if (tList.length > bList.length) {
        newFindings.push(...tList.slice(matchCount))
      }
    }
  }

  for (const [key, bList] of baseMap.entries()) {
    const tList = targetMap.get(key)
    if (!tList) {
      resolvedFindings.push(...bList)
    } else if (bList.length > tList.length) {
      resolvedFindings.push(...bList.slice(tList.length))
    }
  }

  return { newFindings, resolvedFindings, unchangedFindingsCount }
}

function computeRiskDelta(
  baseRank: number,
  targetRank: number,
  permissionEscalations: PermissionEscalation[],
  newFindings: Finding[],
  resolvedFindings: Finding[],
  scoreDelta: number
): RiskDelta {
  if (permissionEscalations.length > 0 || targetRank > baseRank) {
    return 'escalated'
  }
  if (scoreDelta < 0 && newFindings.some((f) => f.severity === 'critical' || f.severity === 'high')) {
    return 'escalated'
  }
  if (targetRank < baseRank) {
    return 'reduced'
  }
  if (scoreDelta > 0 && resolvedFindings.length > 0 && newFindings.length === 0) {
    return 'reduced'
  }
  return 'unchanged'
}

function generateExecutiveSummary(
  report: Omit<SkillDiffReport, 'summary'>,
  overallScore: number
): string {
  const { scoreDelta, permissionEscalations, findingChanges, baseRisk, targetRisk, mcpToolChanges } = report

  const isIdentical =
    scoreDelta === 0 &&
    permissionEscalations.length === 0 &&
    mcpToolChanges.length === 0 &&
    findingChanges.newFindings.length === 0 &&
    findingChanges.resolvedFindings.length === 0 &&
    baseRisk === targetRisk

  if (isIdentical) {
    return `No changes detected: Target version is identical to base version with a score of ${overallScore}/100 and risk level '${targetRisk}'.`
  }

  const scoreText = scoreDelta < 0
    ? `reduces score by ${scoreDelta} points`
    : scoreDelta > 0
      ? `increases score by +${scoreDelta} points`
      : 'maintains score at 0 delta'

  if (permissionEscalations.length > 0) {
    const severityOrder = { critical: 3, high: 2, medium: 1 }
    let maxSev: 'critical' | 'high' | 'medium' = 'medium'
    for (const esc of permissionEscalations) {
      if (severityOrder[esc.severity] > severityOrder[maxSev]) {
        maxSev = esc.severity
      }
    }

    const categories = Array.from(new Set(permissionEscalations.map((e) => e.category)))
    const catLabel = categories.length === 1 ? `${categories[0]}` : categories.join('/')

    return `Warning: Target version escalates permissions with ${permissionEscalations.length} new ${maxSev}-risk ${catLabel} capabilities and ${scoreText} (${baseRisk} -> ${targetRisk}).`
  }

  if (findingChanges.newFindings.length > 0) {
    return `Caution: Target version introduces ${findingChanges.newFindings.length} new security finding(s) and ${scoreText} (${baseRisk} -> ${targetRisk}).`
  }

  if (findingChanges.resolvedFindings.length > 0) {
    return `Improvement: Target version resolves ${findingChanges.resolvedFindings.length} finding(s) with ${scoreText} (${baseRisk} -> ${targetRisk}).`
  }

  if (mcpToolChanges.length > 0) {
    return `Notice: Target version updates MCP tools (${mcpToolChanges.length} tool change(s)) with ${scoreText} (${baseRisk} -> ${targetRisk}).`
  }

  return `Target version ${scoreText} (${baseRisk} -> ${targetRisk}).`
}

export function compareSkillVersions(
  baseResult: ValidationResult,
  targetResult: ValidationResult,
  baseFiles?: SkillFile[],
  targetFiles?: SkillFile[]
): SkillDiffReport {
  const effectiveBaseFiles = resolveEffectiveFiles(baseResult, baseFiles)
  const effectiveTargetFiles = resolveEffectiveFiles(targetResult, targetFiles)

  const skillName = targetResult.skillName || baseResult.skillName || 'unknown-skill'
  const baseVersion = extractVersion(baseResult, effectiveBaseFiles)
  const targetVersion = extractVersion(targetResult, effectiveTargetFiles)

  const scoreDelta = targetResult.overallScore - baseResult.overallScore
  const baseRisk = baseResult.riskLevel || 'safe'
  const targetRisk = targetResult.riskLevel || 'safe'

  const baseRank = RISK_RANKS[baseRisk.toLowerCase()] ?? 0
  const targetRank = RISK_RANKS[targetRisk.toLowerCase()] ?? 0

  const findingChanges = diffFindings(baseResult.findings || [], targetResult.findings || [])
  const permissionEscalations = detectPermissionEscalations(
    effectiveBaseFiles,
    effectiveTargetFiles,
    baseResult,
    targetResult
  )
  const mcpToolChanges = detectMcpToolChanges(effectiveBaseFiles, effectiveTargetFiles)

  const riskDelta = computeRiskDelta(
    baseRank,
    targetRank,
    permissionEscalations,
    findingChanges.newFindings,
    findingChanges.resolvedFindings,
    scoreDelta
  )

  const reportWithoutSummary: Omit<SkillDiffReport, 'summary'> = {
    skillName,
    baseVersion,
    targetVersion,
    scoreDelta,
    riskDelta,
    baseRisk,
    targetRisk,
    permissionEscalations,
    mcpToolChanges,
    findingChanges,
  }

  const summary = generateExecutiveSummary(reportWithoutSummary, targetResult.overallScore)

  return {
    ...reportWithoutSummary,
    summary,
  }
}
