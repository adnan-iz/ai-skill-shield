import { describe, expect, it } from 'vitest'
import { validateCandidateClaims } from '@/lib/review/claims'
import { findingKey, indexFindings } from '@/lib/review/finding-key'
import type { Finding, ValidationResult } from '@/lib/validator/types'

const finding: Finding = {
  id: 'volatile-finding-id', axis: 'security', severity: 'high', category: 'Security',
  ruleId: 'network-pipe-shell', title: 'Network content piped to shell',
  message: 'The command executes downloaded content.', filePath: 'SKILL.md', lineNumber: 12,
}

const scan = { id: 'scan-1', findings: [finding] } satisfies Pick<ValidationResult, 'id' | 'findings'>
const key = findingKey(scan.id, finding)

describe('validateCandidateClaims', () => {
  it('drops model claims for finding keys absent from the scan index', () => {
    expect(validateCandidateClaims([{ findingKey: 'invented', claim: 'remove it' }], indexFindings(scan))).toEqual([])
  })

  it('keeps the first well-formed claim for a known key', () => {
    expect(validateCandidateClaims([
      { findingKey: key, claim: 'This is quoted documentation.' },
      { findingKey: key, claim: 'Duplicate model claim.' },
    ], indexFindings(scan))).toEqual([{ findingKey: key, claim: 'This is quoted documentation.' }])
  })

  it('rejects an entire candidate batch over the review limit', () => {
    const candidates = Array.from({ length: 21 }, (_, index) => ({
      findingKey: key,
      claim: `claim ${index}`,
    }))

    expect(validateCandidateClaims(candidates, indexFindings(scan))).toEqual([])
  })
})
