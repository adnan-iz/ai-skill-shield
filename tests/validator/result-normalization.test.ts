import { expect, it } from 'vitest'
import { runFullValidation } from '@/lib/validator/orchestrator'

it('returns one examples finding and omits fake line zero locations', async () => {
  const result = await runFullValidation({
    files: [{
      path: 'SKILL.md',
      content: '---\nname: reviewer\ndescription: Reviews changes\n---\n\n# Reviewer\n\nReview the supplied change carefully.',
    }],
  })

  expect(result.findings.filter((finding) => finding.ruleId?.startsWith('quality-examples')).map((finding) => finding.title)).toEqual(['No usage examples'])
  expect(result.findings.every((finding) => finding.lineNumber === undefined || finding.lineNumber > 0)).toBe(true)
})

it('scores explicit compatibility evidence without dividing it across every known agent', async () => {
  const result = await runFullValidation({
    files: [{
      path: 'SKILL.md',
      content: '---\nname: reviewer\ndescription: Reviews changes\n---\n\n# Reviewer\n\nUse with Claude Code and ToolUse().',
    }],
  })

  const compatibility = result.axes.find((axis) => axis.key === 'compatibility')
  expect(compatibility?.score).toBeGreaterThanOrEqual(70)
  expect(compatibility?.summary).toContain('1 full')
})
