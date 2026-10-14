import { describe, expect, it } from 'vitest'
import { MAX_BATCH_SKILLS, MAX_FILE_SIZE, validateFiles } from '@/lib/security/input-validation'

describe('batch file validation', () => {
  it('rejects duplicate paths and counts UTF-8 bytes', () => {
    expect(validateFiles([{ path: 'a/run.py', content: '' }, { path: 'a\\run.py', content: '' }])).toContain('Duplicate')
    expect(validateFiles([{ path: 'SKILL.md', content: '界'.repeat(MAX_FILE_SIZE / 2) }])).toContain('File too large')
  })
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
