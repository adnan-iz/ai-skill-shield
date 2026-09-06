import { Finding, SkillFile } from '@/lib/validator/types'
import { extractPermissionManifest } from '@/lib/permissions/manifest'
import { parseFrontmatter } from '@/lib/parser/frontmatter'

export interface DeclaredCapabilities {
  allowsNetwork: boolean
  allowsFilesystemWrite: boolean
  allowsShell: boolean
  hasExplicitManifest: boolean
  declaredSummary: string[]
}

export interface DetectedBehavior {
  category: 'network' | 'filesystem-write' | 'shell-execution' | 'sensitive-env'
  filePath: string
  line: number
  matchedText: string
  description: string
}

const NETWORK_PATTERNS = [
  { regex: /\b(?:fetch\s*\(|axios\.(?:get|post|put|delete|request)|https?\.request\b|net\.connect\b|new\s+WebSocket\b)/, desc: 'JavaScript network request API' },
  { regex: /\b(?:requests\.(?:get|post|put|delete)|urllib\.request|aiohttp\.ClientSession|httpx\.(?:get|post|Client))\b/, desc: 'Python HTTP client request' },
  { regex: /\b(?:curl|wget)\s+['"]?https?:\/\//i, desc: 'CLI network download' },
]

const FS_WRITE_PATTERNS = [
  { regex: /\b(?:fs\.(?:writeFile|writeFileSync|appendFile|appendFileSync|unlink|unlinkSync|rm|rmSync|rmdir|rmdirSync|createWriteStream))\b/, desc: 'Node.js filesystem write/delete call' },
  { regex: /\b(?:open\s*\([^)]*['"][wa+][a-z]*['"]|os\.(?:remove|unlink|rmdir)|shutil\.(?:rmtree|copy|move))\b/, desc: 'Python filesystem modification call' },
  { regex: /\b(?:rm\s+-rf?|truncate\s+|shred\s+|mkfs)\b/, desc: 'Destructive filesystem shell command' },
]

const SHELL_EXEC_PATTERNS = [
  { regex: /\b(?:child_process\.(?:exec|execSync|spawn|spawnSync|fork)|require\s*\(['"]child_process['"]\))/, desc: 'Node.js child_process execution' },
  { regex: /\b(?:subprocess\.(?:run|Popen|check_output|call)|os\.system\b|os\.popen\b)/, desc: 'Python subprocess/os.system execution' },
  { regex: /\b(?:eval\s*\(|new\s+Function\s*\()/, desc: 'Dynamic code execution (eval)' },
]

const SENSITIVE_ENV_PATTERNS = [
  { regex: /(?:process\.env|os\.environ(?:\[|\.get\())\.?['"]?(AWS_SECRET|AWS_ACCESS|OPENAI_API|ANTHROPIC_API|GITHUB_TOKEN|PRIVATE_KEY|DATABASE_URL)/i, desc: 'Sensitive credential access from environment' },
]

/**
 * Extracts declared capabilities from frontmatter and permission manifests.
 */
export function extractDeclaredCapabilities(mainContent: string): DeclaredCapabilities {
  const normalized = mainContent.replace(/\r\n/g, '\n')
  const manifest = extractPermissionManifest(normalized)
  const parsed = parseFrontmatter(normalized)
  const meta = parsed.frontmatter || {}

  let allowsNetwork = false
  let allowsFilesystemWrite = false
  let allowsShell = false
  let hasExplicitManifest = false
  const declaredSummary: string[] = []

  if (manifest?.permissions) {
    hasExplicitManifest = true
    if (manifest.permissions.network?.allow && manifest.permissions.network.allow.length > 0) {
      allowsNetwork = true
      declaredSummary.push(`Network allowed: ${manifest.permissions.network.allow.join(', ')}`)
    }
    if (manifest.permissions.filesystem?.write && manifest.permissions.filesystem.write.length > 0) {
      allowsFilesystemWrite = true
      declaredSummary.push(`FS write allowed: ${manifest.permissions.filesystem.write.join(', ')}`)
    }
    if (manifest.permissions.shell?.allow && manifest.permissions.shell.allow.length > 0) {
      allowsShell = true
      declaredSummary.push(`Shell allowed: ${manifest.permissions.shell.allow.join(', ')}`)
    }
  }

  // Also check textual claims in frontmatter description or tags
  const desc = String(meta.description || '').toLowerCase()
  const claimsOffline = /\b(offline|no\s+network|local\s+only|air-?gapped)\b/.test(desc)
  const claimsReadOnly = /\b(read-?only|view-?only|no\s+file\s+write)\b/.test(desc)
  const claimsNoExec = /\b(no\s+execution|no\s+eval|pure\s+text|safe\s+prompt)\b/.test(desc)

  if (claimsOffline) {
    allowsNetwork = false
    declaredSummary.push('Frontmatter claims: offline / no network')
  }
  if (claimsReadOnly) {
    allowsFilesystemWrite = false
    declaredSummary.push('Frontmatter claims: read-only')
  }
  if (claimsNoExec) {
    allowsShell = false
    declaredSummary.push('Frontmatter claims: no execution')
  }

  return {
    allowsNetwork,
    allowsFilesystemWrite,
    allowsShell,
    hasExplicitManifest: hasExplicitManifest || claimsOffline || claimsReadOnly || claimsNoExec,
    declaredSummary,
  }
}

/**
 * Inspects skill code files to detect real execution behaviors.
 */
export function detectCodeBehaviors(files: SkillFile[]): DetectedBehavior[] {
  const behaviors: DetectedBehavior[] = []

  for (const file of files) {
    // Only inspect executable code or config files
    if (!/\.(js|ts|mjs|cjs|py|sh|bash|json|ya?ml)$/i.test(file.path)) continue

    const lines = file.content.split(/\r?\n/)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('#')) continue // skip pure comment lines

      // Check Network
      for (const p of NETWORK_PATTERNS) {
        if (p.regex.test(line)) {
          behaviors.push({
            category: 'network',
            filePath: file.path,
            line: i + 1,
            matchedText: trimmed.slice(0, 120),
            description: p.desc,
          })
          break
        }
      }

      // Check FS Write
      for (const p of FS_WRITE_PATTERNS) {
        if (p.regex.test(line)) {
          behaviors.push({
            category: 'filesystem-write',
            filePath: file.path,
            line: i + 1,
            matchedText: trimmed.slice(0, 120),
            description: p.desc,
          })
          break
        }
      }

      // Check Shell Exec
      for (const p of SHELL_EXEC_PATTERNS) {
        if (p.regex.test(line)) {
          behaviors.push({
            category: 'shell-execution',
            filePath: file.path,
            line: i + 1,
            matchedText: trimmed.slice(0, 120),
            description: p.desc,
          })
          break
        }
      }

      // Check Sensitive Env
      for (const p of SENSITIVE_ENV_PATTERNS) {
        if (p.regex.test(line)) {
          behaviors.push({
            category: 'sensitive-env',
            filePath: file.path,
            line: i + 1,
            matchedText: trimmed.slice(0, 120),
            description: p.desc,
          })
          break
        }
      }
    }
  }

  return behaviors
}

/**
 * Analyzes discrepancies between declared capabilities and actual detected code behaviors.
 */
export function analyzeCapabilityDrift(
  files: SkillFile[],
  mainContent: string,
  startFindingId: number
): { findings: Finding[]; nextId: number } {
  const declared = extractDeclaredCapabilities(mainContent)
  const behaviors = detectCodeBehaviors(files)
  const findings: Finding[] = []
  let counter = startFindingId

  // Only produce drift findings if the skill declared a manifest or claimed safety constraints
  if (declared.hasExplicitManifest) {
    for (const b of behaviors) {
      if (b.category === 'network' && !declared.allowsNetwork) {
        findings.push({
          id: `finding-drift-${++counter}`,
          axis: 'security',
          severity: 'high',
          category: 'capability-drift',
          title: 'Undeclared Network Activity (Capability Drift)',
          message: `Skill declared no outbound network permissions, but ${b.description} was detected at line ${b.line}.`,
          filePath: b.filePath,
          lineNumber: b.line,
          snippet: b.matchedText,
          recommendation: 'Declare network permissions in the manifest if required, or remove the undeclared network call.',
          ruleId: 'SS-DRIFT-NET',
        })
      }

      if (b.category === 'filesystem-write' && !declared.allowsFilesystemWrite) {
        findings.push({
          id: `finding-drift-${++counter}`,
          axis: 'security',
          severity: 'high',
          category: 'capability-drift',
          title: 'Undeclared Filesystem Modification (Capability Drift)',
          message: `Skill declared read-only or no filesystem write permissions, but ${b.description} was detected at line ${b.line}.`,
          filePath: b.filePath,
          lineNumber: b.line,
          snippet: b.matchedText,
          recommendation: 'Declare filesystem write permissions in the manifest if intended, or remove destructive/writing operations.',
          ruleId: 'SS-DRIFT-FS',
        })
      }

      if (b.category === 'shell-execution' && !declared.allowsShell) {
        findings.push({
          id: `finding-drift-${++counter}`,
          axis: 'security',
          severity: 'high',
          category: 'capability-drift',
          title: 'Undeclared Process / Shell Execution (Capability Drift)',
          message: `Skill declared no shell execution permissions, but ${b.description} was detected at line ${b.line}.`,
          filePath: b.filePath,
          lineNumber: b.line,
          snippet: b.matchedText,
          recommendation: 'Declare shell permissions in the manifest or replace subprocess calls with safe native JavaScript/Python APIs.',
          ruleId: 'SS-DRIFT-EXEC',
        })
      }
    }
  }

  return { findings, nextId: counter }
}
