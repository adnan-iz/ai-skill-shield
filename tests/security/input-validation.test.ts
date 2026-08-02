import { describe, expect, it } from 'vitest'
import { MAX_BATCH_SKILLS, validateFiles } from '@/lib/security/input-validation'

describe('batch file validation', () => {
  it('allows SKILL.md-only batches within the bounded input limit', () => {
    const files = Array.from({ length: MAX_BATCH_SKILLS }, (_, index) => ({
      path: `skills/skill-${index}/SKILL.md`,
      content: '# Skill',
    }))

    expect(validateFiles(files)).toBeNull()
    expect(validateFiles([...files, {
      path: 'skills/one-too-many/SKILL.md',
      content: '# Skill',
    }])).toContain(`max ${MAX_BATCH_SKILLS}`)
  })
})
