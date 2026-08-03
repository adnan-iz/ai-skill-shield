import { describe, expect, it } from 'vitest'
import { parsePolicy } from '@/lib/policy/parser'

describe('parsePolicy', () => {
  it('normalizes a valid policy with preset defaults', () => {
    const policy = parsePolicy('mode: strict\nfailOn: high\nblockedCommands:\n  - curl | bash')

    expect(policy.mode).toBe('strict')
    expect(policy.failOn).toBe('high')
    expect(policy.blockedCommands).toEqual(['curl | bash'])
    expect(policy.requirePermissionManifest).toBe(true)
  })

  it('rejects wrong types and unknown fields instead of claiming validity', () => {
    expect(() => parsePolicy('blockSecrets: yes\nmadeUpControl: true')).toThrow(/blockSecrets must be true or false/)
    expect(() => parsePolicy('blockSecrets: yes\nmadeUpControl: true')).toThrow(/Unknown policy field/)
  })
})
