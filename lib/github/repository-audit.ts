import type { Severity } from '@/lib/validator/types'

export interface GitHubTreeNode {
  path: string
  type: 'tree' | 'blob'
  sha?: string
  mode?: string
  size?: number
  url?: string
}

export interface RepositoryAuditFinding {
  id: string
  severity: Severity
  category: string
  title: string
  message: string
  filePath?: string
  lineNumber?: number
  snippet?: string
  recommendation?: string
}

export interface RepositoryExecutionSurface {
  path: string
  kind: 'workflow' | 'package-manifest' | 'install-script' | 'dockerfile' | 'registry' | 'submodule' | 'requirements' | 'systemd-unit'
  automatic: boolean
}

export interface RepositoryAuditSummary {
  totalFiles: number
  totalDirectories: number
  workflowCount: number
  packageManifestCount: number
  installScriptCount: number
  installSurfaceCount: number
  truncated: boolean
}

export interface RepositoryAudit {
  owner: string
  repo: string
  branch: string
  sha?: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe'
  summary: RepositoryAuditSummary
  surfaces: RepositoryExecutionSurface[]
  findings: RepositoryAuditFinding[]
}

interface RepositoryAuditInput {
  owner: string
  repo: string
  branch: string
  sha?: string
  tree: GitHubTreeNode[]
  files: Array<{ path: string; content: string }>
  truncated?: boolean
}

const EXECUTION_SURFACE_PATTERNS = {
  workflow: /^\.github\/workflows\/.+\.(yml|yaml)$/i,
  packageManifest: /(^|\/)package\.json$/i,
  installScript: /(^|\/)(install|setup|bootstrap)\.(sh|bash|zsh|ps1|cmd|bat)$/i,
  dockerfile: /(^|\/)Dockerfile$/i,
  npmrc: /(^|\/)\.npmrc$/i,
  gitmodules: /(^|\/)\.gitmodules$/i,
  requirements: /(^|\/)requirements\.txt$/i,
  systemdUnit: /\.(service|timer|path|socket|mount|automount)$/i,
}

export function isRepositoryAuditCandidatePath(path: string): boolean {
  const normalized = normalizePath(path)

  return (
    EXECUTION_SURFACE_PATTERNS.packageManifest.test(normalized) ||
    EXECUTION_SURFACE_PATTERNS.installScript.test(normalized) ||
    EXECUTION_SURFACE_PATTERNS.dockerfile.test(normalized) ||
    EXECUTION_SURFACE_PATTERNS.npmrc.test(normalized) ||
    EXECUTION_SURFACE_PATTERNS.gitmodules.test(normalized) ||
    EXECUTION_SURFACE_PATTERNS.requirements.test(normalized) ||
    EXECUTION_SURFACE_PATTERNS.systemdUnit.test(normalized)
  )
}

const LIFECYCLE_SCRIPT_NAMES = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepare',
  'prepublish',
  'prepublishOnly',
  'prepack',
  'postpack',
])

const SUSPICIOUS_COMMAND_PATTERN =
  /(curl|wget|Invoke-WebRequest|iwr).*(\||&&)|\b(Invoke-Expression|iex)\b|\b(bash|sh|powershell|pwsh|cmd|node|npx|npm|pnpm|yarn)\b/i

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
}

function severityRank(severity: Severity): number {
  switch (severity) {
    case 'critical': return 5
    case 'high': return 4
    case 'medium': return 3
    case 'low': return 2
    case 'info': return 1
  }
}

function determineRiskLevel(findings: RepositoryAuditFinding[]): RepositoryAudit['riskLevel'] {
  const highest = findings.reduce<Severity | null>((current, finding) => {
    if (!current || severityRank(finding.severity) > severityRank(current)) {
      return finding.severity
    }
    return current
  }, null)

  switch (highest) {
    case 'critical': return 'critical'
    case 'high': return 'high'
    case 'medium': return 'medium'
    case 'low': return 'low'
    default: return 'safe'
  }
}

function findLineMatch(content: string, matcher: RegExp): { lineNumber?: number; snippet?: string } {
  const lines = content.split('\n')
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]
    if (matcher.test(line)) {
      return {
        lineNumber: index + 1,
        snippet: line.trim().slice(0, 280),
      }
    }
  }

  return {}
}

function buildId(prefix: string, path: string, suffix: string): string {
  return `${prefix}:${path}:${suffix}`.replace(/[^a-zA-Z0-9:_-]/g, '-')
}

export function auditRepositoryTree(input: RepositoryAuditInput): RepositoryAudit {
  const blobNodes = input.tree.filter((node) => node.type === 'blob')
  const directoryNodes = input.tree.filter((node) => node.type === 'tree')
  const findings: RepositoryAuditFinding[] = []
  const installSurfacePaths = new Set<string>()
  const surfaceMap = new Map<string, RepositoryExecutionSurface>()

  const filesByPath = new Map(
    input.files.map((file) => [normalizePath(file.path), file.content])
  )

  for (const node of blobNodes) {
    const path = normalizePath(node.path)

    if (EXECUTION_SURFACE_PATTERNS.workflow.test(path)) {
      installSurfacePaths.add(path)
      surfaceMap.set(path, { path, kind: 'workflow', automatic: true })
      findings.push({
        id: buildId('workflow', path, 'execution-surface'),
        severity: 'low',
        category: 'GitHub Actions',
        title: 'GitHub Actions workflow can execute repository code',
        message: 'This repository ships a GitHub Actions workflow. Review workflow steps and referenced actions before trusting automation from this repo.',
        filePath: path,
        recommendation: 'Check every workflow trigger, `run:` step, and third-party action reference for unexpected code execution.',
      })
    }

    if (
      EXECUTION_SURFACE_PATTERNS.packageManifest.test(path) ||
      EXECUTION_SURFACE_PATTERNS.installScript.test(path) ||
      EXECUTION_SURFACE_PATTERNS.dockerfile.test(path) ||
      EXECUTION_SURFACE_PATTERNS.npmrc.test(path) ||
      EXECUTION_SURFACE_PATTERNS.gitmodules.test(path) ||
      EXECUTION_SURFACE_PATTERNS.requirements.test(path) ||
      EXECUTION_SURFACE_PATTERNS.systemdUnit.test(path)
    ) {
      installSurfacePaths.add(path)
      surfaceMap.set(path, {
        path,
        kind: EXECUTION_SURFACE_PATTERNS.packageManifest.test(path)
          ? 'package-manifest'
          : EXECUTION_SURFACE_PATTERNS.installScript.test(path)
          ? 'install-script'
          : EXECUTION_SURFACE_PATTERNS.dockerfile.test(path)
          ? 'dockerfile'
          : EXECUTION_SURFACE_PATTERNS.npmrc.test(path)
          ? 'registry'
          : EXECUTION_SURFACE_PATTERNS.gitmodules.test(path)
          ? 'submodule'
          : EXECUTION_SURFACE_PATTERNS.requirements.test(path)
          ? 'requirements'
          : 'systemd-unit',
        automatic:
          EXECUTION_SURFACE_PATTERNS.packageManifest.test(path) ||
          EXECUTION_SURFACE_PATTERNS.installScript.test(path) ||
          EXECUTION_SURFACE_PATTERNS.workflow.test(path) ||
          EXECUTION_SURFACE_PATTERNS.systemdUnit.test(path),
      })
    }
  }

  for (const [path, content] of filesByPath) {
    if (EXECUTION_SURFACE_PATTERNS.packageManifest.test(path)) {
      let manifest: unknown

      try {
        manifest = JSON.parse(content)
      } catch {
        findings.push({
          id: buildId('package-json', path, 'parse-error'),
          severity: 'medium',
          category: 'Package Manifest',
          title: 'package.json could not be parsed',
          message: 'The repository package.json is malformed, which makes install-time behavior harder to audit.',
          filePath: path,
          recommendation: 'Fix package.json syntax before trusting this repository.',
        })
        continue
      }

      const scripts = typeof manifest === 'object' && manifest !== null && 'scripts' in manifest
        ? (manifest as { scripts?: Record<string, string> }).scripts
        : undefined

      if (scripts) {
        for (const [name, command] of Object.entries(scripts)) {
          if (!LIFECYCLE_SCRIPT_NAMES.has(name)) continue

          const isSuspicious = SUSPICIOUS_COMMAND_PATTERN.test(command)
          findings.push({
            id: buildId('lifecycle', path, name),
            severity: isSuspicious ? 'critical' : 'high',
            category: 'Install Script',
            title: `Detected lifecycle script: ${name}`,
            message: isSuspicious
              ? `The ${name} lifecycle script runs shell or network commands during install: ${command}`
              : `The ${name} lifecycle script executes automatically during install: ${command}`,
            filePath: path,
            snippet: command,
            recommendation: isSuspicious
              ? 'Do not install this package blindly. Review the full command, its download targets, and every script it invokes.'
              : 'Review whether this lifecycle script is necessary and safe before installation.',
          })
        }
      }
    }

    if (EXECUTION_SURFACE_PATTERNS.installScript.test(path)) {
      if (/curl.*\|.*(bash|sh)|wget.*\|.*(bash|sh)/i.test(content)) {
        const match = findLineMatch(content, /curl.*\|.*(bash|sh)|wget.*\|.*(bash|sh)/i)
        findings.push({
          id: buildId('install-script', path, 'pipe-shell'),
          severity: 'critical',
          category: 'Install Script',
          title: 'Install script pipes network to shell',
          message: 'The repository contains an install script that downloads remote content and executes it immediately.',
          filePath: path,
          lineNumber: match.lineNumber,
          snippet: match.snippet,
          recommendation: 'Require pinned downloads and checksum verification instead of pipe-to-shell execution.',
        })
      }

      if (/\b(eval|Invoke-Expression|iex)\b|`[^`]+`|\$\([^)]+\)/i.test(content)) {
        const match = findLineMatch(content, /\b(eval|Invoke-Expression|iex)\b|`[^`]+`|\$\([^)]+\)/i)
        findings.push({
          id: buildId('install-script', path, 'dynamic-exec'),
          severity: 'high',
          category: 'Install Script',
          title: 'Install script uses dynamic execution',
          message: 'The install script uses eval, command substitution, or equivalent dynamic execution patterns.',
          filePath: path,
          lineNumber: match.lineNumber,
          snippet: match.snippet,
          recommendation: 'Replace dynamic execution with explicit commands so the install surface is auditable.',
        })
      }
    }

    if (EXECUTION_SURFACE_PATTERNS.gitmodules.test(path)) {
      const nonGithubMatch = /url\s*=\s*https?:\/\/(?!github\.com)[^\s]+/i
      const insecureMatch = /url\s*=\s*http:\/\//i

      if (nonGithubMatch.test(content)) {
        const match = findLineMatch(content, nonGithubMatch)
        findings.push({
          id: buildId('gitmodules', path, 'external-host'),
          severity: insecureMatch.test(content) ? 'high' : 'medium',
          category: 'Submodule',
          title: 'Git submodule points outside GitHub',
          message: 'The repository uses a submodule hosted on an external domain, which expands the trust boundary.',
          filePath: path,
          lineNumber: match.lineNumber,
          snippet: match.snippet,
          recommendation: 'Verify the external host, pin exact commits, and review the fetched submodule before installation.',
        })
      }
    }

    if (EXECUTION_SURFACE_PATTERNS.npmrc.test(path) && /registry\s*=\s*(?!https:\/\/registry\.npmjs\.org)/i.test(content)) {
      const match = findLineMatch(content, /registry\s*=/i)
      findings.push({
        id: buildId('npmrc', path, 'custom-registry'),
        severity: 'high',
        category: 'Registry',
        title: 'Custom npm registry configured',
        message: 'This repository overrides the default npm registry, which can redirect installs to an untrusted package source.',
        filePath: path,
        lineNumber: match.lineNumber,
        snippet: match.snippet,
        recommendation: 'Confirm the registry host is trusted and expected before any dependency installation.',
      })
    }

    if (EXECUTION_SURFACE_PATTERNS.requirements.test(path) && /^-i\s+|--index-url|--extra-index-url/im.test(content)) {
      const match = findLineMatch(content, /^-i\s+|--index-url|--extra-index-url/i)
      findings.push({
        id: buildId('requirements', path, 'custom-index'),
        severity: 'high',
        category: 'Registry',
        title: 'Python install uses a custom package index',
        message: 'The repository points Python installs at a custom package index.',
        filePath: path,
        lineNumber: match.lineNumber,
        snippet: match.snippet,
        recommendation: 'Validate the package index and its packages before installation.',
      })
    }
  }

  const summary: RepositoryAuditSummary = {
    totalFiles: blobNodes.length,
    totalDirectories: directoryNodes.length,
    workflowCount: blobNodes.filter((node) => EXECUTION_SURFACE_PATTERNS.workflow.test(normalizePath(node.path))).length,
    packageManifestCount: blobNodes.filter((node) => EXECUTION_SURFACE_PATTERNS.packageManifest.test(normalizePath(node.path))).length,
    installScriptCount: blobNodes.filter((node) => EXECUTION_SURFACE_PATTERNS.installScript.test(normalizePath(node.path))).length,
    installSurfaceCount: installSurfacePaths.size,
    truncated: Boolean(input.truncated),
  }

  return {
    owner: input.owner,
    repo: input.repo,
    branch: input.branch,
    sha: input.sha,
    riskLevel: determineRiskLevel(findings),
    summary,
    surfaces: Array.from(surfaceMap.values()).sort((a, b) => a.path.localeCompare(b.path)),
    findings,
  }
}
