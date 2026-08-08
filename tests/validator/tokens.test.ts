import { describe, expect, it } from 'vitest'
import { validateTokens } from '@/lib/validator/tokens'

describe('token validation', () => {
  it('keeps oversized documentation out of security severity', () => {
    const result = validateTokens('a'.repeat(20_100), {}, 'a'.repeat(20_100))
    const finding = result.findings.find((candidate) => candidate.ruleId === 'tokens-limit-exceeded')
    expect(finding?.severity).toBe('low')
  })
})
