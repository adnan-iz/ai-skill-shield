import { describe, expect, it } from 'vitest'
import { listSkillDirectories, normalizeSkillDirectoryPath, scopeSkillBlobs, selectSkillEntryBlobs, selectValidationBlobs } from '@/lib/github/file-selection'
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

describe('skill directory selection', () => {
  it('lists every skill and normalizes direct SKILL.md targets to their directory', () => {
    const tree: GitHubTreeNode[] = [
      { path: 'SKILL.md', type: 'blob' },
      { path: 'skills/reviewer/SKILL.md', type: 'blob' },
      { path: 'skills/writer/SKILL.md', type: 'blob' },
      { path: 'skills/writer/script.ts', type: 'blob' },
    ]

    expect(listSkillDirectories(tree)).toEqual(['', 'skills/reviewer', 'skills/writer'])
    expect(normalizeSkillDirectoryPath('/skills/reviewer/SKILL.md/')).toBe('skills/reviewer')
  })

  it('keeps one skill payload isolated from sibling skill directories', () => {
    const tree: GitHubTreeNode[] = [
      { path: 'skills/reviewer/SKILL.md', type: 'blob' },
      { path: 'skills/reviewer/scripts/check.ts', type: 'blob' },
      { path: 'skills/writer/SKILL.md', type: 'blob' },
      { path: 'skills/writer/scripts/publish.ts', type: 'blob' },
    ]

    expect(scopeSkillBlobs(tree, 'skills/reviewer').map((item) => item.path)).toEqual([
      'skills/reviewer/SKILL.md',
      'skills/reviewer/scripts/check.ts',
    ])
  })

  it('selects every SKILL.md entry for a repository batch scan', () => {
    const tree: GitHubTreeNode[] = [
      { path: 'README.md', type: 'blob' },
      { path: 'skills/reviewer/SKILL.md', type: 'blob' },
      { path: 'skills/reviewer/script.ts', type: 'blob' },
      { path: 'skills/writer/SKILL.md', type: 'blob' },
    ]

    expect(selectSkillEntryBlobs(tree, 500).map((item) => item.path)).toEqual([
      'skills/reviewer/SKILL.md',
      'skills/writer/SKILL.md',
    ])
  })
})
