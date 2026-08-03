import { describe, expect, it } from 'vitest'
import {
  githubBadgePath,
  githubTrustPath,
  parseGitHubTrustTarget,
  trustTargetForSource,
} from '@/lib/trust'

describe('public trust paths', () => {
  it('builds canonical GitHub paths and rejects unsafe targets', () => {
    const target = parseGitHubTrustTarget('openai', 'skills', ['skills', 'reviewer'])

    expect(target).toEqual({ owner: 'openai', repo: 'skills', path: 'skills/reviewer' })
    expect(githubTrustPath(target!)).toBe('/trust/github/openai/skills/skills/reviewer')
    expect(githubBadgePath(target!)).toBe('/api/badge/github/openai/skills/skills/reviewer?v=2')
    expect(parseGitHubTrustTarget('openai', 'skills', '../private')).toBeNull()
  })

  it('publishes only scans explicitly identified as public', () => {
    const source = {
      type: 'github' as const,
      owner: 'openai',
      repo: 'skills',
      path: 'reviewer',
      sha: '0123456789012345678901234567890123456789',
      repositoryMeta: {
        fullName: 'openai/skills',
        isPrivate: false,
        stars: 1,
        forks: 0,
        openIssues: 0,
        archived: false,
        isDefaultBranchHead: true,
      },
    }

    expect(trustTargetForSource(source)).toEqual({ owner: 'openai', repo: 'skills', path: 'reviewer' })
    expect(trustTargetForSource({ ...source, repositoryMeta: { ...source.repositoryMeta, isPrivate: true } })).toBeNull()
    expect(trustTargetForSource({ ...source, repositoryMeta: { ...source.repositoryMeta, isDefaultBranchHead: false } })).toBeNull()
  })
})
