import { describe, expect, it } from 'vitest'
import { countFileTree } from '@/lib/report/metrics'

describe('dashboard report metrics', () => {
  it('counts files instead of top-level tree nodes', () => {
    expect(countFileTree([
      {
        path: 'skills',
        type: 'directory',
        size: 0,
        children: [
          { path: 'skills/one/SKILL.md', type: 'file', size: 10 },
          { path: 'skills/two/SKILL.md', type: 'file', size: 20 },
        ],
      },
      { path: 'README.md', type: 'file', size: 30 },
    ])).toBe(3)
  })
})
