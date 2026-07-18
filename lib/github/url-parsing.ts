export interface ParsedRepositoryUrl {
  owner: string
  repo: string
  path: string
  url: string
  branch?: string
  sha?: string
}

function trimSlashes(value: string): string {
  return value.replace(/^\/+|\/+$/g, '')
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function decodeSegments(parts: string[]): string[] {
  return parts.map(decodeSegment)
}

function stripGitSuffix(repo: string): string {
  return repo.replace(/\.git$/i, '')
}

function isGitHubHost(hostname: string): boolean {
  return hostname === 'github.com' || hostname === 'www.github.com'
}

function isSkillsHost(hostname: string): boolean {
  return hostname === 'skills.sh' || hostname === 'www.skills.sh'
}

function isRawGitHubHost(hostname: string): boolean {
  return hostname === 'raw.githubusercontent.com'
}

function joinPath(parts: string[]): string {
  return trimSlashes(parts.filter(Boolean).join('/'))
}

export function parseRepositoryUrl(input: string): ParsedRepositoryUrl | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  let url: URL

  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const segments = decodeSegments(url.pathname.split('/').filter(Boolean))

  if (isSkillsHost(url.hostname)) {
    if (segments.length < 3) return null

    const [owner, repo, ...pathParts] = segments
    return {
      owner,
      repo: stripGitSuffix(repo),
      path: joinPath(pathParts),
      url: trimmed,
    }
  }

  if (isRawGitHubHost(url.hostname)) {
    if (segments.length < 4) return null

    const [owner, repo, branch, ...pathParts] = segments
    return {
      owner,
      repo: stripGitSuffix(repo),
      path: joinPath(pathParts),
      branch,
      url: trimmed,
    }
  }

  if (!isGitHubHost(url.hostname) || segments.length < 2) {
    return null
  }

  const [owner, repoSegment, kind, ...rest] = segments
  const repo = stripGitSuffix(repoSegment)

  if (!kind) {
    return { owner, repo, path: '', url: trimmed }
  }

  if (kind !== 'tree' && kind !== 'blob') {
    return { owner, repo, path: '', url: trimmed }
  }

  if (rest.length === 0) {
    return { owner, repo, path: '', url: trimmed }
  }

  const [branch, ...pathParts] = rest

  return {
    owner,
    repo,
    path: joinPath(pathParts),
    branch,
    url: trimmed,
  }
}
