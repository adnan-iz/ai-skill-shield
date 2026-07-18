import { describe, expect, it } from 'vitest'
import { parseRepositoryUrl } from '@/lib/github/url-parsing'

describe('parseRepositoryUrl', () => {
  it('parses skills.sh skill slugs', () => {
    expect(parseRepositoryUrl('https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices')).toEqual({
      owner: 'vercel-labs',
      repo: 'agent-skills',
      path: 'vercel-react-best-practices',
      url: 'https://www.skills.sh/vercel-labs/agent-skills/vercel-react-best-practices',
    })
  })

  it('parses nested skills.sh paths', () => {
    expect(parseRepositoryUrl('https://skills.sh/vercel-labs/agent-skills/skills/react-best-practices')).toEqual({
      owner: 'vercel-labs',
      repo: 'agent-skills',
      path: 'skills/react-best-practices',
      url: 'https://skills.sh/vercel-labs/agent-skills/skills/react-best-practices',
    })
  })

  it('parses GitHub tree URLs with branch and path', () => {
    expect(parseRepositoryUrl('https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices')).toEqual({
      owner: 'vercel-labs',
      repo: 'agent-skills',
      path: 'skills/react-best-practices',
      branch: 'main',
      url: 'https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices',
    })
  })

  it('parses GitHub blob URLs', () => {
    expect(parseRepositoryUrl('https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md')).toEqual({
      owner: 'vercel-labs',
      repo: 'agent-skills',
      path: 'skills/react-best-practices/SKILL.md',
      branch: 'main',
      url: 'https://github.com/vercel-labs/agent-skills/blob/main/skills/react-best-practices/SKILL.md',
    })
  })

  it('parses raw GitHub URLs', () => {
    expect(parseRepositoryUrl('https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/react-best-practices/SKILL.md')).toEqual({
      owner: 'vercel-labs',
      repo: 'agent-skills',
      path: 'skills/react-best-practices/SKILL.md',
      branch: 'main',
      url: 'https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/react-best-practices/SKILL.md',
    })
  })

  it('normalizes repo URLs with .git suffix and fragments', () => {
    expect(parseRepositoryUrl('https://github.com/vercel-labs/agent-skills.git/?tab=readme#top')).toEqual({
      owner: 'vercel-labs',
      repo: 'agent-skills',
      path: '',
      url: 'https://github.com/vercel-labs/agent-skills.git/?tab=readme#top',
    })
  })
})
