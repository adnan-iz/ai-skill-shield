import { describe, expect, it } from 'vitest'
import { MAX_BATCH_SKILLS, validateFiles } from '@/lib/security/input-validation'

describe('batch file validation', () => {
  it('allows large SKILL.md-only batches within the bounded limit', () => {
    const files = Array.from({ length: 261 }, (_, index) => ({
      path: `skills/skill-${index}/SKILL.md`,
      content: '# Skill',
    }))

    expect(validateFiles(files)).toBeNull()
    expect(validateFiles([...files, ...Array.from({ length: MAX_BATCH_SKILLS - files.length + 1 }, (_, index) => ({
      path: `more/skill-${index}/SKILL.md`,
      content: '# Skill',
    }))])).toContain(`max ${MAX_BATCH_SKILLS}`)
  })
})
