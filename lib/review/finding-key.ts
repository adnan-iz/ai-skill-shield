import { createHash } from 'node:crypto'
import type { Finding, ValidationResult } from '@/lib/validator/types'

function normalizePath(path: string): string {
  return path
    .replaceAll('\\', '/')
    .split('/')
    .filter((part) => part.length > 0 && part !== '.')
    .join('/')
}

function normalizeEvidence(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

/**
 * Produces a scan-scoped identity from immutable finding attributes. The
 * validator's generated finding ID is intentionally not part of the identity.
 */
export function findingKey(scanId: string, finding: Finding): string {
  const identity = [
    scanId,
    finding.axis,
    finding.ruleId || finding.category,
    normalizePath(finding.filePath || ''),
    finding.lineNumber || 0,
    finding.title.trim(),
    normalizeEvidence(finding.snippet || finding.message),
  ].join('\0')
  return createHash('sha256').update(identity).digest('hex')
}

export type FindingIndex = Map<string, Finding>

/** Builds the allow-list used to reject model-invented finding references. */
export function indexFindings(scan: Pick<ValidationResult, 'id' | 'findings'>): FindingIndex {
  return new Map(scan.findings.map((finding) => [findingKey(scan.id, finding), finding]))
}
