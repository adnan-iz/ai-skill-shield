import { afterEach, expect, it, vi } from 'vitest'
import { runFullValidation } from '@/lib/validator/orchestrator'

afterEach(() => vi.unstubAllGlobals())

it('preserves all advisories for a package, including a later critical advisory', async () => {
  vi.stubGlobal('fetch', vi.fn()
    .mockResolvedValueOnce(Response.json({ results: [{ vulns: [{ id: 'GHSA-first' }, { id: 'GHSA-second' }] }] }))
    .mockResolvedValueOnce(Response.json({ id: 'GHSA-first', summary: 'Medium risk', database_specific: { severity: 'MODERATE' } }))
    .mockResolvedValueOnce(Response.json({ id: 'GHSA-second', summary: 'Critical risk', database_specific: { severity: 'CRITICAL' } })))
  const result = await runFullValidation({ files: [
    { path: 'SKILL.md', content: '---\nname: demo\ndescription: Help Codex.\n---\n# Demo' },
    { path: 'package.json', content: '{"dependencies":{"unique-advisory-fixture":"1.2.3"}}' },
  ] })
  expect(result.findings.filter(finding => finding.ruleId === 'dependency-vulnerability')).toHaveLength(2)
  expect(result.riskLevel).toBe('critical')
})
