import { describe, expect, it } from 'vitest'
import { detectCompatibility } from '@/lib/validator/compatibility'
import { validateFrontmatter } from '@/lib/validator/frontmatter'

describe('Agent Skills specification alignment', () => {
  it('accepts the portable minimum frontmatter without vendor metadata penalties', () => {
    const result = validateFrontmatter({ name: 'reviewer', description: 'Reviews pull requests' })

    expect(result.score).toBe(100)
    expect(result.findings).toEqual([])
  })

  it('treats a standard SKILL.md as portable when vendor behavior is not declared', () => {
    const matrix = detectCompatibility(
      '---\nname: reviewer\ndescription: Reviews pull requests\n---\n# Reviewer',
      [{ path: 'SKILL.md', content: '# Reviewer' }]
    )

    expect(matrix.agents.every((agent) => agent.status !== 'unknown')).toBe(true)
    expect(matrix.agents[0].notes).toContain('Standard Agent Skills format')
  })
})
