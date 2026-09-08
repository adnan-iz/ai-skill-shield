import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('issue 89 regression fixture', () => {
  it('keeps the fixture sanitized and bounded', () => {
    const fixture = JSON.parse(readFileSync(resolve(process.cwd(), 'tests/fixtures/review/ai-olympus-89.json'), 'utf8'))
    expect(fixture.sourceSha).toBe('2ce448fb4e90')
    expect(fixture.challengedFindingKeys).toHaveLength(9)
    expect(JSON.stringify(fixture)).not.toMatch(/BEGIN .*PRIVATE KEY|ghp_|sk-[A-Za-z0-9]/)
    expect(fixture.excerpts.every((item: { endLine: number; startLine: number }) => item.endLine - item.startLine < 20)).toBe(true)
  })
})
