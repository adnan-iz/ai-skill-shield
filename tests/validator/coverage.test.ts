import { expect, it } from 'vitest'
import { runFullValidation } from '@/lib/validator/orchestrator'
import { scanCoverage } from '@/lib/validator/coverage'

it('records the supplied file scope on new scans', async () => {
  const result = await runFullValidation({ files: [{ path: 'SKILL.md', content: '---\nname: demo\ndescription: Help Codex.\n---\n# Demo' }] })
  expect(result).toHaveProperty('coverage.status', 'complete')
  expect(result).toHaveProperty('coverage.inspectedFiles', 1)
})

it('does not call omitted or malformed inventory complete', () => {
  const files = [{ path: 'SKILL.md', content: '# Demo' }]
  expect(scanCoverage({ files, coverage: { status: 'complete', discoveredFiles: 2, inspectedFiles: 1, skippedFiles: [] } }).status).toBe('partial')
  expect(scanCoverage({ files, coverage: {} as never }).status).toBe('unknown')
})
