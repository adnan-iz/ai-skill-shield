import { parse as parseYaml } from 'yaml'
import type { PolicyConfig, PolicyMode, SeverityOverride } from './types'

const ALLOWED_MODES: PolicyMode[] = ['default', 'strict', 'enterprise', 'custom']
const ALLOWED_FAILON: PolicyConfig['failOn'][] = ['critical', 'high', 'medium', 'low', 'info']

const DEFAULT_POLICY: PolicyConfig = {
  mode: 'default',
  failOn: 'high',
  blockSecrets: true,
  blockDestructiveCommands: true,
  requirePermissionManifest: false,
  allowExternalDomains: [],
  blockedCommands: [],
  maxFileSizeMB: 10,
  maxFiles: 100,
  severityOverrides: [],
  allowedFileExtensions: [],
  blockedFindings: [],
}

const STRICT_POLICY: Partial<PolicyConfig> = {
  mode: 'strict',
  failOn: 'medium',
  blockSecrets: true,
  blockDestructiveCommands: true,
  requirePermissionManifest: true,
  blockedCommands: ['curl', 'wget', 'sudo', 'chmod', 'chown', 'rm -rf', 'eval'],
  maxFileSizeMB: 5,
  maxFiles: 50,
}

const ENTERPRISE_POLICY: Partial<PolicyConfig> = {
  mode: 'enterprise',
  failOn: 'low',
  blockSecrets: true,
  blockDestructiveCommands: true,
  requirePermissionManifest: true,
  blockedCommands: ['curl', 'wget', 'sudo', 'chmod', 'chown', 'rm -rf', 'eval', 'ssh', 'telnet', 'nc', 'nmap'],
  maxFileSizeMB: 3,
  maxFiles: 30,
}

function mergeWithDefaults(partial: Partial<PolicyConfig>): PolicyConfig {
  return { ...DEFAULT_POLICY, ...partial }
}

function getModeDefaults(mode: PolicyMode): Partial<PolicyConfig> {
  switch (mode) {
    case 'strict':
      return STRICT_POLICY
    case 'enterprise':
      return ENTERPRISE_POLICY
    default:
      return {}
  }
}

const ALLOWED_SEVERITIES: SeverityOverride['overrideSeverity'][] = ['critical', 'high', 'medium', 'low', 'info']
const ALLOWED_KEYS = new Set<keyof PolicyConfig>([
  'mode', 'failOn', 'blockSecrets', 'blockDestructiveCommands', 'requirePermissionManifest',
  'allowExternalDomains', 'blockedCommands', 'maxFileSizeMB', 'maxFiles',
  'severityOverrides', 'allowedFileExtensions', 'blockedFindings',
])

function validateStringArray(value: unknown, key: string, errors: string[]): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    errors.push(`${key} must be an array of strings`)
  }
}

function validateConfig(config: Partial<PolicyConfig>): string[] {
  const errors: string[] = []

  for (const key of Object.keys(config)) {
    if (!ALLOWED_KEYS.has(key as keyof PolicyConfig)) errors.push(`Unknown policy field: ${key}`)
  }

  if (config.mode && !ALLOWED_MODES.includes(config.mode)) {
    errors.push(`Invalid mode: ${config.mode}. Allowed: ${ALLOWED_MODES.join(', ')}`)
  }

  if (config.failOn && !ALLOWED_FAILON.includes(config.failOn)) {
    errors.push(`Invalid failOn: ${config.failOn}. Allowed: ${ALLOWED_FAILON.join(', ')}`)
  }

  for (const key of ['blockSecrets', 'blockDestructiveCommands', 'requirePermissionManifest'] as const) {
    if (config[key] != null && typeof config[key] !== 'boolean') errors.push(`${key} must be true or false`)
  }

  if (config.maxFileSizeMB != null && (typeof config.maxFileSizeMB !== 'number' || !Number.isFinite(config.maxFileSizeMB) || config.maxFileSizeMB < 0)) {
    errors.push('maxFileSizeMB must be a non-negative number')
  }

  if (config.maxFiles != null && (typeof config.maxFiles !== 'number' || !Number.isInteger(config.maxFiles) || config.maxFiles < 0)) {
    errors.push('maxFiles must be a non-negative integer')
  }

  if (config.allowExternalDomains != null) validateStringArray(config.allowExternalDomains, 'allowExternalDomains', errors)
  if (config.blockedCommands != null) validateStringArray(config.blockedCommands, 'blockedCommands', errors)
  if (config.allowedFileExtensions != null) validateStringArray(config.allowedFileExtensions, 'allowedFileExtensions', errors)
  if (config.blockedFindings != null) validateStringArray(config.blockedFindings, 'blockedFindings', errors)

  if (config.severityOverrides) {
    if (!Array.isArray(config.severityOverrides)) {
      errors.push('severityOverrides must be an array')
    } else {
      for (let i = 0; i < config.severityOverrides.length; i++) {
        const o = config.severityOverrides[i]
        if (!o || typeof o !== 'object') {
          errors.push(`severityOverrides[${i}] must be an object`)
          continue
        }
        if (!o.ruleId && !o.category) {
          errors.push(`severityOverrides[${i}]: must specify ruleId or category`)
        }
        if (o.overrideSeverity && !ALLOWED_SEVERITIES.includes(o.overrideSeverity)) {
          errors.push(`severityOverrides[${i}]: invalid overrideSeverity "${o.overrideSeverity}"`)
        }
      }
    }
  }

  return errors
}

export function parsePolicy(content: string): PolicyConfig {
  const parsed = parseYaml(content)

  if (!parsed) {
    return { ...DEFAULT_POLICY }
  }

  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid policy configuration:\nPolicy must be a YAML object')
  }

  const partial = parsed as Partial<PolicyConfig>
  const errors = validateConfig(partial)

  if (errors.length > 0) {
    throw new Error(`Invalid policy configuration:\n${errors.join('\n')}`)
  }

  const mode = partial.mode || 'default'
  const modeDefaults = getModeDefaults(mode)
  const merged = mergeWithDefaults({ ...modeDefaults, ...partial })
  merged.mode = mode

  return merged
}
