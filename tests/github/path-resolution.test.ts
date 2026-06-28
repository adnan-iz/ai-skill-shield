import { describe, expect, it } from 'vitest'
import { matchSkillDirectory } from '@/app/api/github/route'
import type { GitHubTreeNode } from '@/lib/github/repository-audit'

describe('matchSkillDirectory', () => {
  it('matches skills.sh slug variants to nested skills directories', () => {
    const tree: GitHubTreeNode[] = [
      { path: 'skills', type: 'tree' },
      { path: 'skills/react-best-practices', type: 'tree' },
      { path: 'skills/react-best-practices/SKILL.md', type: 'blob' },
      { path: 'skills/react-best-practices/README.md', type: 'blob' },
      { path: 'skills/composition-patterns', type: 'tree' },
      { path: 'skills/composition-patterns/SKILL.md', type: 'blob' },
    ]

    expect(matchSkillDirectory(tree, 'vercel-react-best-practices')).toBe('skills/react-best-practices')
  })

  it('prefers exact direct matches when they exist', () => {
    const tree: GitHubTreeNode[] = [
      { path: 'react-best-practices', type: 'tree' },
      { path: 'react-best-practices/SKILL.md', type: 'blob' },
      { path: 'skills/react-best-practices', type: 'tree' },
      { path: 'skills/react-best-practices/SKILL.md', type: 'blob' },
    ]

    expect(matchSkillDirectory(tree, 'react-best-practices')).toBe('react-best-practices')
  })
})
