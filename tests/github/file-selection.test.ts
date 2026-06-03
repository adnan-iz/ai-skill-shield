import { describe, expect, it } from 'vitest'
import { selectValidationBlobs } from '@/lib/github/file-selection'
import type { GitHubTreeNode } from '@/lib/github/repository-audit'

describe('selectValidationBlobs', () => {
  it('prioritizes install surfaces and root metadata when a repository is large', () => {
    const blobs: GitHubTreeNode[] = [
      { path: 'README.md', type: 'blob' },
      { path: 'package.json', type: 'blob' },
      { path: '.github/workflows/release.yml', type: 'blob' },
      { path: 'scripts/install.sh', type: 'blob' },
      { path: '.npmrc', type: 'blob' },
      ...Array.from({ length: 80 }, (_, index) => ({
        path: `src/components/component-${index}.tsx`,
        type: 'blob' as const,
      })),
    ]

    const selected = selectValidationBlobs(blobs, {
      allowedExtensions: new Set(['.md', '.json', '.yml', '.sh', '.tsx']),
      maxFiles: 5,
    })

    expect(selected.map((blob) => blob.path)).toEqual([
      'package.json',
      'README.md',
      '.github/workflows/release.yml',
      'scripts/install.sh',
      '.npmrc',
    ])
  })
})
