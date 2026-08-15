import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { markdownTokenEstimate } from '@/lib/markdown-negotiation'

const homepageMarkdown = `# AI Skill Shield

> Validate agent skills before they touch your environment.

AI Skill Shield is a free security scanner for AI agent skills. Upload a skill package, audit a GitHub repository, or paste raw SKILL.md content to review security, compatibility, and install risk in one report.

## What AI Skill Shield checks

- Exposed secrets and destructive commands
- Shell execution and external network access
- Permission and install-time risks
- Agent ecosystem compatibility
- GitHub repository evidence and security policy concerns

## How it works

1. Import a repository, uploaded package, or SKILL.md.
2. Inspect security findings, permissions, compatibility, and repository risks.
3. Review the score, evidence, install recommendation, and exportable report.

## Resources

- [Explore verified agent skills](/explore)
- [Read the API reference](/docs/api)
- [Security rules](/rules)
`

const exploreMarkdown = `# Find agent skills worth trusting

AI Skill Shield's public trust index links each listing to evidence from a public default-branch scan. Search the corpus, compare vendors, and inspect risks before installation.

Use the HTML page for interactive filtering and pagination: [/explore](/explore).
`

async function markdownForPath(pathname: string): Promise<string> {
  if (pathname === '/' || pathname === '') return homepageMarkdown
  if (pathname === '/explore') return exploreMarkdown
  if (pathname === '/docs/api') {
    return readFile(join(process.cwd(), 'docs', 'api.md'), 'utf8')
  }

  return `# AI Skill Shield\n\nThe page [${pathname}](${pathname}) is available as HTML.\n\nVisit the [AI Skill Shield homepage](/) to validate agent skills before installation.\n`
}

export async function GET(request: Request) {
  const pathname = new URL(request.url).searchParams.get('path') || '/'
  const markdown = `---\ntitle: AI Skill Shield\n---\n\n${await markdownForPath(pathname)}`

  return new Response(markdown, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Vary': 'Accept',
      'x-markdown-tokens': markdownTokenEstimate(markdown),
    },
  })
}
