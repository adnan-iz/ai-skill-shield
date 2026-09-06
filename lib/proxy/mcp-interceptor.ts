import type { PermissionManifest } from '@/lib/permissions'
import type { McpCallRequest, ProxyDecision, ProxyPolicy } from './types'

// Shell injection regex patterns
const SHELL_INJECTION_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: '; rm', pattern: /;\s*rm\b/i },
  { name: '&& rm', pattern: /&&\s*rm\b/i },
  { name: '|| rm', pattern: /\|\|\s*rm\b/i },
  { name: 'curl | bash', pattern: /(?:curl|wget|fetch|iwr|irm)\b[^|;\n]*\|\s*(?:sudo\s+)?(?:ba)?sh\b/i },
  { name: 'pipe to bash/sh', pattern: /\|\s*(?:sudo\s+)?(?:ba)?sh\b/i },
  { name: 'rm -rf', pattern: /\brm\s+-[a-zA-Z]*r[a-zA-Z]*f\b/i },
  { name: 'subshell execution with rm', pattern: /(?:\$\(|\`)\s*rm\b/i },
  { name: 'rm -r', pattern: /\brm\s+-[a-zA-Z]*r\b/i },
]

// DLP secret patterns
const DLP_PATTERNS: Array<{ type: string; pattern: RegExp }> = [
  {
    type: 'OpenAI API Key',
    pattern: /\bsk-(?:proj-)?[a-zA-Z0-9_-]{20,}\b/g,
  },
  {
    type: 'Anthropic API Key',
    pattern: /\bsk-ant-[a-zA-Z0-9_-]{20,}\b/g,
  },
  {
    type: 'AWS Access Key ID',
    pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g,
  },
  {
    type: 'AWS Secret Access Key',
    pattern: /(?:aws_secret_access_key|aws_secret_key|secret_key)\s*[:=]\s*['"]?([0-9a-zA-Z\/+]{40})['"]?/gi,
  },
  {
    type: 'Private Key',
    pattern: /-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----[\s\S]*?(?:-----END (?:[A-Z0-9_-]+ )?PRIVATE KEY-----|$)/g,
  },
  {
    type: 'GitHub Token',
    pattern: /\b(?:ghp_[a-zA-Z0-9]{36}|gho_[a-zA-Z0-9]{36}|ghu_[a-zA-Z0-9]{36}|ghs_[a-zA-Z0-9]{36}|ghr_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{22,})\b/g,
  },
  {
    type: 'Slack Token',
    pattern: /\bxox[baprs]-[0-9a-zA-Z-]{10,}\b/g,
  },
  {
    type: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey|api_secret|app_secret)\s*[:=]\s*['"]?([a-zA-Z0-9_\-]{16,64})['"]?/gi,
  },
  {
    type: 'Password Assignment',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"]?([^'"\s]{6,})['"]?/gi,
  },
]

const SENSITIVE_KEY_REGEX = /^(?:password|passwd|pwd|api_?key|access_?token|auth_?token|secret|private_?key)$/i
const URL_REGEX = /https?:\/\/([a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)*)/gi

interface ArgumentEntry {
  keyPath: string
  key: string
  value: string
}

function extractStringEntries(obj: unknown, prefix = ''): ArgumentEntry[] {
  const entries: ArgumentEntry[] = []
  if (typeof obj === 'string') {
    entries.push({ keyPath: prefix || 'arg', key: prefix.split('.').pop() || 'arg', value: obj })
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      entries.push(...extractStringEntries(item, `${prefix}[${index}]`))
    })
  } else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const nextKey = prefix ? `${prefix}.${k}` : k
      entries.push(...extractStringEntries(v, nextKey))
    }
  }
  return entries
}

function normalizePosixPath(p: string): string {
  let normalized = p.replace(/\\/g, '/')
  const isAbsolute = normalized.startsWith('/')
  const driveMatch = normalized.match(/^([a-zA-Z]:)(\/.*)?$/)
  let drivePrefix = ''
  if (driveMatch) {
    drivePrefix = driveMatch[1]
    normalized = driveMatch[2] || '/'
  }

  const segments = normalized.split('/').filter((s) => s.length > 0 && s !== '.')
  const stack: string[] = []

  for (const seg of segments) {
    if (seg === '..') {
      if (stack.length > 0 && stack[stack.length - 1] !== '..') {
        stack.pop()
      } else if (!isAbsolute && !drivePrefix) {
        stack.push('..')
      }
    } else {
      stack.push(seg)
    }
  }

  const res = stack.join('/')
  if (drivePrefix) {
    return `${drivePrefix}/${res}`
  }
  if (isAbsolute) {
    return `/${res}`
  }
  return res || '.'
}

function isInsideAllowedDirectory(target: string, allowedDirs: string[]): boolean {
  const normTarget = normalizePosixPath(target)
  for (const dir of allowedDirs) {
    const normDir = normalizePosixPath(dir).replace(/\/+$/, '')
    let resolved = normTarget
    if (!normTarget.startsWith('/') && !/^[a-zA-Z]:\//.test(normTarget)) {
      resolved = normalizePosixPath(`${normDir}/${normTarget}`)
    }
    if (resolved === normDir || resolved.startsWith(normDir + '/')) {
      return true
    }
  }
  return false
}

function containsExplicitTraversalOrSensitivePath(val: string): boolean {
  if (val.includes('../') || val.includes('..\\') || val.includes('..%2f') || val.includes('..%5c')) {
    return true
  }
  if (val.includes('/etc/passwd')) {
    return true
  }
  if (val.includes('~/.ssh') || val.includes('~\\.ssh') || val.includes('.ssh/id_')) {
    return true
  }
  return false
}

function extractDomainsFromText(text: string): string[] {
  const domains: string[] = []
  URL_REGEX.lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = URL_REGEX.exec(text)) !== null) {
    domains.push(match[1].toLowerCase())
  }
  return domains
}

function redactSecretsInValue(val: string, key: string): { sanitized: string; detectedSecrets: string[] } {
  const detectedSecrets: string[] = []
  let result = val

  // Key-based secret redaction if direct assignment
  if (SENSITIVE_KEY_REGEX.test(key) && val.trim().length > 0 && !val.includes('[REDACTED]')) {
    detectedSecrets.push(`Sensitive field '${key}'`)
    return { sanitized: '[REDACTED]', detectedSecrets }
  }

  // Pattern-based secret redaction
  for (const rule of DLP_PATTERNS) {
    rule.pattern.lastIndex = 0
    if (rule.pattern.test(result)) {
      detectedSecrets.push(rule.type)
      rule.pattern.lastIndex = 0
      result = result.replace(rule.pattern, '[REDACTED]')
    }
  }

  return { sanitized: result, detectedSecrets }
}

function deepSanitize(obj: unknown, prefix = ''): { sanitized: unknown; detected: Array<{ path: string; type: string }> } {
  const detected: Array<{ path: string; type: string }> = []

  if (typeof obj === 'string') {
    const key = prefix.split('.').pop() || 'arg'
    const { sanitized, detectedSecrets } = redactSecretsInValue(obj, key)
    for (const sec of detectedSecrets) {
      detected.push({ path: prefix || 'arg', type: sec })
    }
    return { sanitized, detected }
  }

  if (Array.isArray(obj)) {
    const nextArr: unknown[] = []
    obj.forEach((item, idx) => {
      const res = deepSanitize(item, `${prefix}[${idx}]`)
      nextArr.push(res.sanitized)
      detected.push(...res.detected)
    })
    return { sanitized: nextArr, detected }
  }

  if (obj && typeof obj === 'object') {
    const nextObj: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      const nextKey = prefix ? `${prefix}.${k}` : k
      const res = deepSanitize(v, nextKey)
      nextObj[k] = res.sanitized
      detected.push(...res.detected)
    }
    return { sanitized: nextObj, detected }
  }

  return { sanitized: obj, detected }
}

export function evaluateMcpCall(
  request: McpCallRequest,
  policy: ProxyPolicy,
  manifest?: PermissionManifest
): ProxyDecision {
  // 1. Non-tool execution methods (e.g. tools/list) are allowed safely
  if (request.method && request.method !== 'tools/call') {
    return {
      action: 'allow',
      riskLevel: 'safe',
      violations: [],
      reason: `Method '${request.method}' does not execute tools`,
    }
  }

  const toolName = request.params?.name
  const args = request.params?.arguments || {}
  const stringEntries = extractStringEntries(args)

  const criticalViolations: string[] = []
  const highViolations: string[] = []
  const mediumViolations: string[] = []

  // 2. Blocked tools check
  if (policy.blockedTools && toolName && policy.blockedTools.includes(toolName)) {
    highViolations.push(`Tool '${toolName}' is blocked by policy`)
  }

  // 3. Shell injection check in arguments (rm -rf, curl | bash, ; rm, && rm)
  for (const entry of stringEntries) {
    for (const rule of SHELL_INJECTION_PATTERNS) {
      if (rule.pattern.test(entry.value)) {
        criticalViolations.push(
          `Shell injection pattern detected in argument '${entry.keyPath}': ${rule.name}`
        )
        break
      }
    }
  }

  // 4. Path traversal outside policy.allowedDirectories
  const allowedDirs = policy.allowedDirectories || []
  const hasAllowedDirs = allowedDirs.length > 0

  for (const entry of stringEntries) {
    const hasTraversalToken = containsExplicitTraversalOrSensitivePath(entry.value)
    const isPathKey = /(?:path|file|dir|folder|dest|src|target|uri)/i.test(entry.key)
    const isPathValue = entry.value.startsWith('/') || /^[a-zA-Z]:[/\\]/.test(entry.value) || entry.value.startsWith('~/')

    if (hasTraversalToken) {
      if (!hasAllowedDirs) {
        criticalViolations.push(
          `Path traversal or sensitive path detected in argument '${entry.keyPath}': ${entry.value}`
        )
      } else {
        const isSafe = isInsideAllowedDirectory(entry.value, allowedDirs)
        if (!isSafe) {
          criticalViolations.push(
            `Path traversal outside allowed directories in argument '${entry.keyPath}': ${entry.value}`
          )
        }
      }
    } else if (hasAllowedDirs && (isPathKey || isPathValue)) {
      const isSafe = isInsideAllowedDirectory(entry.value, allowedDirs)
      if (!isSafe) {
        criticalViolations.push(
          `Path outside allowed directories in argument '${entry.keyPath}': ${entry.value}`
        )
      }
    }
  }

  // 5. Permission Manifest Scope Enforcement
  if (policy.enforcePermissionManifest && !manifest) {
    highViolations.push('Permission manifest is required by policy but was not provided')
  }

  if (manifest?.permissions) {
    // Filesystem scope
    const declaredRead = manifest.permissions.filesystem?.read || []
    const declaredWrite = manifest.permissions.filesystem?.write || []
    const declaredPaths = [...declaredRead, ...declaredWrite]

    if (declaredPaths.length > 0) {
      for (const entry of stringEntries) {
        const isPathKey = /(?:path|file|dir|folder|dest|src|target|uri)/i.test(entry.key)
        const isPathValue = entry.value.startsWith('/') || /^[a-zA-Z]:[/\\]/.test(entry.value) || entry.value.startsWith('~/')
        if (isPathKey || isPathValue) {
          const isAllowed = declaredPaths.some((p) => {
            const normP = normalizePosixPath(p).replace(/\/+$/, '')
            const normVal = normalizePosixPath(entry.value)
            return normVal === normP || normVal.startsWith(normP + '/')
          })
          if (!isAllowed) {
            highViolations.push(
              `Filesystem access outside declared manifest scope in argument '${entry.keyPath}': ${entry.value}`
            )
          }
        }
      }
    }

    // Network scope
    const manifestAllowedDomains = manifest.permissions.network?.allow
    if (manifestAllowedDomains && manifestAllowedDomains.length > 0) {
      const allowedDomainSet = new Set(manifestAllowedDomains.map((d) => d.toLowerCase()))
      for (const entry of stringEntries) {
        const extractedDomains = extractDomainsFromText(entry.value)
        if (/(?:url|domain|host|endpoint)/i.test(entry.key) && !entry.value.includes('://')) {
          extractedDomains.push(entry.value.toLowerCase())
        }
        for (const dom of extractedDomains) {
          const allowed =
            allowedDomainSet.has(dom) ||
            Array.from(allowedDomainSet).some((d) => d.startsWith('*.') && dom.endsWith(d.slice(2)))
          if (!allowed) {
            highViolations.push(
              `Network access to undeclared domain '${dom}' in manifest from argument '${entry.keyPath}'`
            )
          }
        }
      }
    }

    // Shell deny scope
    const deniedShell = manifest.permissions.shell?.deny || []
    if (deniedShell.length > 0) {
      for (const entry of stringEntries) {
        for (const deniedCmd of deniedShell) {
          if (entry.value.includes(deniedCmd)) {
            highViolations.push(
              `Denied shell command '${deniedCmd}' detected in argument '${entry.keyPath}'`
            )
          }
        }
      }
    }
  }

  // 6. Blocked domains check from policy
  if (policy.blockedDomains && policy.blockedDomains.length > 0) {
    const blockedSet = new Set(policy.blockedDomains.map((d) => d.toLowerCase()))
    for (const entry of stringEntries) {
      const domains = extractDomainsFromText(entry.value)
      if (/(?:url|domain|host|endpoint)/i.test(entry.key) && !entry.value.includes('://')) {
        domains.push(entry.value.toLowerCase())
      }
      for (const dom of domains) {
        if (blockedSet.has(dom)) {
          highViolations.push(`Access to blocked domain '${dom}' in argument '${entry.keyPath}'`)
        }
      }
    }
  }

  // 7. DLP inspection
  let modifiedArguments: Record<string, unknown> | undefined
  if (policy.dlpInspectArgs) {
    const { sanitized, detected } = deepSanitize(args)
    if (detected.length > 0) {
      if (policy.dlpAction === 'block') {
        for (const d of detected) {
          highViolations.push(`Secret detected in argument '${d.path}': ${d.type}`)
        }
      } else {
        for (const d of detected) {
          mediumViolations.push(`Secret detected and redacted in argument '${d.path}': ${d.type}`)
        }
        modifiedArguments = sanitized as Record<string, unknown>
      }
    }
  }

  // 8. Determine final decision and risk level
  const allViolations = [...criticalViolations, ...highViolations, ...mediumViolations]

  if (criticalViolations.length > 0) {
    return {
      action: 'block',
      riskLevel: 'critical',
      reason: criticalViolations.join('; '),
      violations: allViolations,
    }
  }

  if (highViolations.length > 0) {
    return {
      action: 'block',
      riskLevel: 'high',
      reason: highViolations.join('; '),
      violations: allViolations,
    }
  }

  if (mediumViolations.length > 0) {
    return {
      action: 'sanitize',
      riskLevel: 'medium',
      reason: mediumViolations.join('; '),
      modifiedArguments,
      violations: allViolations,
    }
  }

  return {
    action: 'allow',
    riskLevel: 'safe',
    violations: [],
    reason: 'Request allowed by policy',
  }
}
