import { createHash } from 'node:crypto'
import type { Finding, SkillFile } from '../../../lib/validator/types'
import { SECURITY_ENGINE_VERSION } from './shared-security'

export interface Baseline {
  version: 1
  engineVersion: string
  sourceHash: string
  entries: { fingerprint: string; reason: string }[]
}
export const hash = (value: string) => createHash('sha256').update(value).digest('hex')
export function sourceHash(files: SkillFile[]): string {
  return hash(JSON.stringify([...files].sort((a, b) => a.path.localeCompare(b.path)).map(f => [f.path, hash(f.content)])))
}
export function findingFingerprint(f: Finding): string {
  return hash(JSON.stringify([f.ruleId, f.axis, f.severity, f.category, f.title, f.message, f.filePath, f.lineNumber, f.snippet]))
}
export function validateBaseline(value: unknown): asserts value is Baseline {
  const b = value as Baseline
  if (!b || b.version !== 1 || b.engineVersion !== SECURITY_ENGINE_VERSION || !/^[a-f0-9]{64}$/.test(b.sourceHash) || !Array.isArray(b.entries) || b.entries.some(e => !e || !/^[a-f0-9]{64}$/.test(e.fingerprint) || typeof e.reason !== 'string' || !e.reason.trim())) {
    throw new Error('Invalid baseline or incompatible security engine version')
  }
}
