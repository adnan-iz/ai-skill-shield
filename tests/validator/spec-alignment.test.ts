import { describe, expect, it } from 'vitest'
import { detectCompatibility } from '@/lib/validator/compatibility'
import { validateFrontmatter } from '@/lib/validator/frontmatter'

describe('Agent Skills specification alignment', () => {
  it('accepts the portable minimum frontmatter without vendor metadata penalties', () => {
    const result = validateFrontmatter({ name: 'reviewer', description: 'Reviews pull requests' })

    expect(result.score).toBe(100)
    expect(result.findings).toEqual([])
  })

  it('does not claim runtime compatibility from the standard filename alone', () => {
    const matrix = detectCompatibility(
      '---\nname: reviewer\ndescription: Reviews pull requests\n---\n# Reviewer',
      [{ path: 'SKILL.md', content: '# Reviewer' }]
    )

    expect(matrix.agents.every((agent) => agent.status === 'unknown')).toBe(true)
    expect(matrix.overallCompatibility).toBe(10)
  })

  it('reports explicit agent markers without inflating unrelated agents', () => {
    const matrix = detectCompatibility(
      '# Reviewer\nUse this skill with Claude Code and ToolUse()',
      [{ path: 'SKILL.md', content: '# Reviewer' }]
    )

    expect(matrix.agents.find((agent) => agent.id === 'claude-code')?.status).toBe('full')
    expect(matrix.agents.find((agent) => agent.id === 'cursor')?.status).toBe('unknown')
  })
})
