import { parse as parseYaml } from 'yaml'

export interface PermissionManifest {
  name?: string
  version?: string
  permissions?: {
    filesystem?: {
      read?: string[]
      write?: string[]
    }
    network?: {
      allow?: string[]
    }
    shell?: {
      allow?: string[]
      deny?: string[]
    }
    environment?: {
      allow?: string[]
      deny?: string[]
    }
  }
}

export interface PermissionViolation {
  type: 'filesystem' | 'network' | 'shell' | 'environment'
  declared: string
  detected: string
  severity: 'low' | 'medium' | 'high'
  message: string
}

function findDelimitedBlock(content: string, openingMarker: string): string | null {
  const lines = content.split(/\r?\n/)
  const openingIndex = lines.findIndex((line) => line.trim() === openingMarker)
  if (openingIndex === -1) return null

  const closingIndex = lines.findIndex((line, index) => index > openingIndex && line.trim() === '---')
  return closingIndex === -1 ? null : lines.slice(openingIndex + 1, closingIndex).join('\n')
}

function findStandaloneManifest(content: string): string | null {
  const lines = content.split(/\r?\n/)
  const openingIndex = lines.findIndex((line, index) => line.startsWith('name:') && lines[index + 1]?.trim() === 'permissions:')
  if (openingIndex === -1) return null

  const closingIndex = lines.findIndex((line, index) => index > openingIndex && line.trim() === '')
  return lines.slice(openingIndex, closingIndex === -1 ? undefined : closingIndex).join('\n')
}

export function extractPermissionManifest(content: string): PermissionManifest | null {
  const permissionBlock = findDelimitedBlock(content, '---permissions')
  if (permissionBlock !== null) {
    try {
      const parsed = parseYaml(permissionBlock.trim(), { schema: 'failsafe' })
      if (parsed && typeof parsed === 'object' && 'permissions' in parsed) {
        return parsed as PermissionManifest
      }
    } catch {
      // fall through
    }
  }

  const frontmatter = findDelimitedBlock(content, '---')
  if (frontmatter !== null) {
    try {
      const parsed = parseYaml(frontmatter.trim(), { schema: 'failsafe' })
      if (parsed && typeof parsed === 'object' && 'permissions' in parsed) {
        const { permissions, name, version } = parsed as Record<string, unknown>
        return { name: name as string, version: version as string, permissions: permissions as PermissionManifest['permissions'] }
      }
    } catch {
      // fall through
    }
  }

  const standaloneManifest = findStandaloneManifest(content)
  if (standaloneManifest !== null) {
    try {
      const parsed = parseYaml(standaloneManifest, { schema: 'failsafe' })
      if (parsed && typeof parsed === 'object' && 'permissions' in parsed) {
        return parsed as PermissionManifest
      }
    } catch {
      return null
    }
  }

  return null
}

const URL_RE = /https?:\/\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)/g
const ENV_VAR_RE = /process\.env\.(\w+)|`?\$\{?(\w+)\}?`?|env\.(\w+)/g
const PATH_RE = /['"`](\/(?:[a-zA-Z0-9_./-]+\/)?[a-zA-Z0-9_.-]+)['"`]/g
const SHELL_COMMAND_PREFIXES = ['rm -rf', 'curl', 'wget', 'bash', 'chmod ', 'chown', 'mkfs', 'dd if=', ':() {']

function findShellCommands(content: string): string[] {
  const commands: string[] = []
  for (const line of content.split(/\r?\n/)) {
    const command = line.trimStart()
    const prefix = SHELL_COMMAND_PREFIXES.find((candidate) => command.startsWith(candidate))
    if (prefix) commands.push(prefix)
  }
  return commands
}

function extractDomains(content: string): Set<string> {
  const domains = new Set<string>()
  let match: RegExpExecArray | null
  URL_RE.lastIndex = 0
  while ((match = URL_RE.exec(content)) !== null) {
    domains.add(match[1].toLowerCase())
  }
  return domains
}

function extractEnvVars(content: string): Set<string> {
  const vars = new Set<string>()
  let match: RegExpExecArray | null
  ENV_VAR_RE.lastIndex = 0
  while ((match = ENV_VAR_RE.exec(content)) !== null) {
    const v = match[1] || match[2] || match[3]
    if (v) vars.add(v)
  }
  return vars
}

function extractPaths(content: string): Set<string> {
  const paths = new Set<string>()
  let match: RegExpExecArray | null
  PATH_RE.lastIndex = 0
  while ((match = PATH_RE.exec(content)) !== null) {
    paths.add(match[1])
  }
  return paths
}

function isSubPath(accessed: string, declared: string[]): boolean {
  return declared.some(d => accessed.startsWith(d) || accessed === d)
}

export function detectPermissionViolations(
  content: string,
  _filePath: string,
  manifest: PermissionManifest,
): PermissionViolation[] {
  const violations: PermissionViolation[] = []
  const perms = manifest.permissions

  if (!perms) return violations

  if (perms.network?.allow) {
    const allowed = new Set(perms.network.allow.map(d => d.toLowerCase()))
    const detected = extractDomains(content)
    for (const domain of detected) {
      if (!allowed.has(domain)) {
        violations.push({
          type: 'network',
          declared: 'network.allow',
          detected: domain,
          severity: 'high',
          message: `Network request to undeclared domain: ${domain}`,
        })
      }
    }
  }

  if (perms.shell?.deny && perms.shell.deny.length > 0) {
    for (const cmd of findShellCommands(content)) {
      if (perms.shell.deny.some(d => cmd.includes(d) || d.includes(cmd))) {
        violations.push({
          type: 'shell',
          declared: `shell.deny: ${perms.shell.deny.join(', ')}`,
          detected: cmd,
          severity: 'high',
          message: `Denied shell command detected: ${cmd}`,
        })
      }
    }
  }

  if (perms.filesystem?.read || perms.filesystem?.write) {
    const readPaths = perms.filesystem.read || []
    const writePaths = perms.filesystem.write || []
    const allDeclared = [...readPaths, ...writePaths]
    const accessed = extractPaths(content)
    for (const ap of accessed) {
      if (allDeclared.length > 0 && !isSubPath(ap, allDeclared)) {
        violations.push({
          type: 'filesystem',
          declared: `filesystem: ${allDeclared.join(', ')}`,
          detected: ap,
          severity: 'medium',
          message: `Filesystem access outside declared paths: ${ap}`,
        })
      }
    }
  }

  if (perms.environment?.deny) {
    const detected = extractEnvVars(content)
    for (const v of detected) {
      if (perms.environment.deny.some(d => d === v || v.startsWith(d))) {
        violations.push({
          type: 'environment',
          declared: `environment.deny: ${perms.environment.deny.join(', ')}`,
          detected: v,
          severity: 'medium',
          message: `Denied environment variable referenced: ${v}`,
        })
      }
    }
  }

  return violations
}

export function extractDeclaredPermissions(manifest: PermissionManifest): string[] {
  const list: string[] = []
  const perms = manifest.permissions
  if (!perms) return list

  if (perms.filesystem?.read) list.push(`filesystem read: ${perms.filesystem.read.join(', ')}`)
  if (perms.filesystem?.write) list.push(`filesystem write: ${perms.filesystem.write.join(', ')}`)
  if (perms.network?.allow) list.push(`network allow: ${perms.network.allow.join(', ')}`)
  if (perms.shell?.allow) list.push(`shell allow: ${perms.shell.allow.join(', ')}`)
  if (perms.shell?.deny) list.push(`shell deny: ${perms.shell.deny.join(', ')}`)
  if (perms.environment?.allow) list.push(`environment allow: ${perms.environment.allow.join(', ')}`)
  if (perms.environment?.deny) list.push(`environment deny: ${perms.environment.deny.join(', ')}`)

  return list
}
