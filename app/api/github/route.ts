import { NextRequest } from 'next/server'
import { validateOwnerRepo, validateBranch, validateCommitSha } from '@/lib/security/input-validation'
import { MAX_BATCH_SKILLS, MAX_FILES as MAX_VALIDATION_FILES } from '@/lib/security/input-validation'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { badRequest, tooManyRequests, notFound, serverError } from '@/lib/api-error'
import { auditRepositoryTree, isRepositoryAuditCandidatePath, type GitHubTreeNode } from '@/lib/github/repository-audit'
import { listSkillDirectories, normalizeSkillDirectoryPath, scopeSkillBlobs, selectSkillEntryBlobs, selectValidationBlobs } from '@/lib/github/file-selection'
import type { RepositoryMeta } from '@/lib/validator/types'
import { validateAndSave } from '@/lib/validator/service'

const FETCH_TIMEOUT = 15_000
const DEFAULT_IGNORE_PATHS = ['.git', 'node_modules', '.next', 'dist', 'build', 'vendor', 'coverage', '.cache', 'venv', '__pycache__']
const GITHUB_USER_AGENT = 'skillshield/1.0'

function normalizeSkillPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase()
}

function slugVariants(skillName: string): string[] {
  const normalized = normalizeSkillPath(skillName)
  const variants = new Set<string>()
  const parts = normalized.split('-').filter(Boolean)

  variants.add(normalized)

  for (let i = 1; i < parts.length - 1; i++) {
    variants.add(parts.slice(i).join('-'))
  }

  return Array.from(variants)
}

export function matchSkillDirectory(tree: GitHubTreeNode[], skillName: string): string | null {
  const variants = slugVariants(skillName)

  const candidates = tree.filter((item) =>
    item.type === 'tree' &&
    tree.some((candidate) => candidate.path === `${item.path}/SKILL.md`)
  )

  let bestMatch: { path: string; score: number } | null = null

  for (const candidate of candidates) {
    const normalizedPath = normalizeSkillPath(candidate.path)
    const strippedSkillsPrefix = normalizedPath.startsWith('skills/') ? normalizedPath.slice('skills/'.length) : normalizedPath
    const baseName = strippedSkillsPrefix.split('/').pop() || strippedSkillsPrefix
    const aliases = new Set([
      normalizedPath,
      strippedSkillsPrefix,
      baseName,
      strippedSkillsPrefix.replace(/\//g, '-'),
    ])

    for (const variant of variants) {
      let score = 0

      if (normalizedPath === variant) score = 1000
      else if (strippedSkillsPrefix === variant) score = 950
      else if (normalizedPath === `skills/${variant}`) score = 925
      else if (baseName === variant) score = 900
      else if (normalizedPath.endsWith(`/${variant}`)) score = 850
      else if (aliases.has(variant)) score = 800

      if (score === 0) continue

      score -= normalizedPath.split('/').length

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { path: candidate.path, score }
      }
    }
  }

  return bestMatch?.path || null
}

function shouldIgnore(path: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some(pattern => {
    if (pattern.startsWith('*')) return path.endsWith(pattern.slice(1))
    if (pattern.endsWith('/')) return path.startsWith(pattern) || path.includes('/' + pattern)
    return path === pattern || path.startsWith(pattern + '/')
  })
}

function ipFromRequest(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function fetchWithTimeout(path: string, options: RequestInit = {}, timeoutMs = FETCH_TIMEOUT, host: 'api' | 'raw' = 'api'): Promise<Response> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Unsupported GitHub request URL')
  }
  const allowedUrl = host === 'api'
    ? `https://api.github.com${path}`
    : `https://raw.githubusercontent.com${path}`
  // ponytail: one retry covers transient GitHub disconnects; add backoff only if rate-limit data warrants it.
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(allowedUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          ...githubHeaders(),
          ...(options.headers || {}),
        },
      })
      const body = response.status === 204 || response.status === 304
        ? null
        : await response.arrayBuffer()
      const headers = new Headers(response.headers)
      headers.delete('content-encoding')
      headers.delete('content-length')
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      if (attempt === 1) throw error
    } finally {
      clearTimeout(timer)
    }
  }

  throw new Error('GitHub request failed')
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'User-Agent': GITHUB_USER_AGENT,
    Accept: 'application/vnd.github+json',
  }

  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export function githubAuthError(response: Response): string | null {
  const tokenConfigured = Boolean(process.env.GITHUB_TOKEN?.trim())

  if (response.status === 401) {
    return 'GitHub rejected GITHUB_TOKEN. Replace it in Vercel and redeploy.'
  }
  if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
    return tokenConfigured
      ? 'GitHub API limit reached for the configured GITHUB_TOKEN. Wait for the quota reset or use another token.'
      : 'GitHub API limit reached. Configure GITHUB_TOKEN in Vercel and redeploy.'
  }
  if (response.status === 403) {
    return 'GitHub denied access. Check that GITHUB_TOKEN can read public repositories, then redeploy.'
  }

  return null
}

export async function POST(request: NextRequest) {
  const clientIp = ipFromRequest(request)

  try {
    const rl = await checkRateLimit(`github:${clientIp}`, { maxRequests: 30, windowMs: 60_000 })
    if (!rl.allowed) {
      return addRateLimitHeaders(tooManyRequests(rl.resetAt), rl)
    }

    const { owner, repo, path, branch, sha, includeExtensions, excludeExtensions, ignorePaths, rescan } = await request.json()

    const validationError = validateOwnerRepo(owner, repo)
    if (validationError) {
      return badRequest(validationError)
    }

    let resolvedBranch: string
    let treePath: string

    if (branch) {
      const branchError = validateBranch(branch)
      if (branchError) return badRequest(branchError)
      resolvedBranch = branch
      treePath = path || ''
    } else {
      const resolved = await resolvePath(owner, repo, path || '')
      resolvedBranch = resolved.branch
      treePath = resolved.treePath
    }

    if (sha) {
      const shaError = validateCommitSha(sha)
      if (shaError) return badRequest(shaError)
    }

    const requestedSkillFile = /(^|\/)SKILL\.md$/i.test(treePath.replace(/\\/g, '/'))
    treePath = normalizeSkillDirectoryPath(treePath)
    const resolvedSha = sha || await resolveCommitSha(owner, repo, resolvedBranch)
    const treeRef = resolvedSha || resolvedBranch
    const treeRes = await fetchWithTimeout(
       `/repos/${owner}/${repo}/git/trees/${treeRef}?recursive=1`
    )

    if (!treeRes.ok) {
      const authError = githubAuthError(treeRes)
      if (authError) return serverError(authError)
      return notFound('Skill path not found in repository')
    }

    const data = await treeRes.json()
    const skillDirectories = listSkillDirectories(data.tree || [])
    const analyzeAllSkills = !treePath && !requestedSkillFile && skillDirectories.length > 1
    if (analyzeAllSkills && skillDirectories.length > MAX_BATCH_SKILLS) {
      return badRequest(`Repository contains ${skillDirectories.length} skills; batch scans support up to ${MAX_BATCH_SKILLS}`)
    }
    if (!treePath && !requestedSkillFile && skillDirectories.length === 1) {
      treePath = skillDirectories[0]
    }

    const [rawRepositoryMeta, auditFiles] = await Promise.all([
      fetchRepositoryMeta(owner, repo),
      fetchRepositoryAuditFiles(owner, repo, treeRef, data),
    ])
    const repositoryMeta = rawRepositoryMeta
      ? {
          ...rawRepositoryMeta,
          isDefaultBranchHead: !sha && resolvedBranch === rawRepositoryMeta.defaultBranch,
        }
      : undefined
    const repositoryAudit = auditRepositoryTree({
      owner,
      repo,
      branch: resolvedBranch,
      sha: resolvedSha,
      tree: data.tree || [],
      files: auditFiles,
      truncated: Boolean(data.truncated),
    })

    const response = await fetchFiles(owner, repo, resolvedBranch, treePath, data, {
      sha: resolvedSha,
      includeExtensions,
      excludeExtensions,
      ignorePaths,
      repositoryAudit,
      repositoryMeta,
      analyzeAllSkills,
      discoveredSkillCount: skillDirectories.length,
    })

    if (analyzeAllSkills && response.ok) {
      const payload = await response.json() as {
        files: Array<{ path: string; content: string }>
        path: string
        repositoryAudit?: ReturnType<typeof auditRepositoryTree>
        repositoryMeta?: RepositoryMeta
      }
      const source = {
        type: 'github' as const,
        url: `https://github.com/${owner}/${repo}`,
        owner,
        repo,
        path: payload.path,
        branch: resolvedBranch,
        sha: resolvedSha,
        repositoryAudit: payload.repositoryAudit,
        repositoryMeta: payload.repositoryMeta,
      }
      const validationResult = await validateAndSave({
        name: `${owner}/${repo}`,
        files: payload.files,
        source,
        analyzeAllSkills: true,
      }, { source, rescan: rescan === true })

      return addRateLimitHeaders(Response.json({
        validationResultId: validationResult.id,
        skillCount: validationResult.batch?.totalSkills || 0,
      }), rl)
    }

    return addRateLimitHeaders(response, rl)
  } catch (error) {
    console.error(JSON.stringify({
      level: 'error',
      message: 'GitHub import failed',
      requestId: request.headers.get('x-vercel-id'),
      error: error instanceof Error ? error.message : String(error),
    }))
    if (error instanceof DOMException && error.name === 'AbortError') {
      return serverError('Request timed out')
    }
    return serverError('GitHub import failed on the server')
  }
}

async function resolvePath(owner: string, repo: string, path: string): Promise<{ branch: string; treePath: string }> {
  if (!path) {
    const branch = await getDefaultBranch(owner, repo)
    return { branch, treePath: '' }
  }

  const segments = path.split('/')
  const first = segments[0]
  const rest = segments.slice(1).join('/')

  if (rest) {
    const testUrl = `/repos/${owner}/${repo}/git/refs/heads/${first}`
    const testRes = await fetchWithTimeout(testUrl)
    if (testRes.ok) {
      return { branch: first, treePath: rest }
    }
    const defaultBranch = await getDefaultBranch(owner, repo)
    return { branch: defaultBranch, treePath: path }
  }

  const defaultBranch = await getDefaultBranch(owner, repo)

  const discovered = await findSkillDirectory(owner, repo, defaultBranch, first)
  if (discovered) {
    return { branch: defaultBranch, treePath: discovered }
  }

  const testUrl = `/repos/${owner}/${repo}/git/refs/heads/${first}`
  const testRes = await fetchWithTimeout(testUrl, { headers: { 'User-Agent': 'skillshield/1.0' } })
  if (testRes.ok) {
    return { branch: first, treePath: '' }
  }

  return { branch: defaultBranch, treePath: first }
}

async function findSkillDirectory(owner: string, repo: string, branch: string, skillName: string): Promise<string | null> {
  const rootRes = await fetchWithTimeout(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`
  )
  if (!rootRes.ok) return null

  const root = await rootRes.json()
  return matchSkillDirectory(root.tree || [], skillName)
}

async function getDefaultBranch(owner: string, repo: string): Promise<string> {
  const repoRes = await fetchWithTimeout(`/repos/${owner}/${repo}`)
  if (repoRes.ok) {
    const repoData = await repoRes.json()
    return repoData.default_branch || 'main'
  }

  for (const candidate of ['main', 'master']) {
    const headRes = await fetchWithTimeout(
      `/repos/${owner}/${repo}/git/refs/heads/${candidate}`
    )
    if (headRes.ok) return candidate
  }

  return 'main'
}

async function resolveCommitSha(owner: string, repo: string, ref: string): Promise<string | undefined> {
  const response = await fetchWithTimeout(
    `/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`
  )
  if (!response.ok) return undefined

  const data = await response.json() as { sha?: unknown }
  return typeof data.sha === 'string' && /^[0-9a-f]{40}$/i.test(data.sha) ? data.sha : undefined
}

async function fetchFiles(
  owner: string,
  repo: string,
  branch: string,
  treePath: string,
  treeData: { tree: GitHubTreeNode[] },
  options?: {
    sha?: string
    includeExtensions?: string[]
    excludeExtensions?: string[]
    ignorePaths?: string[]
    repositoryAudit?: ReturnType<typeof auditRepositoryTree>
    repositoryMeta?: RepositoryMeta | undefined
    analyzeAllSkills?: boolean
    discoveredSkillCount?: number
  }
) {
  const {
    sha,
    includeExtensions,
    excludeExtensions,
    ignorePaths = DEFAULT_IGNORE_PATHS,
    repositoryAudit,
    repositoryMeta,
    analyzeAllSkills = false,
    discoveredSkillCount = 0,
  } = options || {}

  const textExtensions = new Set([
    '.md', '.json', '.yaml', '.yml', '.txt', '.ts', '.tsx', '.js', '.jsx',
    '.py', '.rb', '.go', '.rs', '.java', '.c', '.h', '.cpp', '.hpp',
    '.css', '.html', '.sh', '.bash', '.zsh', '.toml', '.ini', '.cfg',
    '.env', '.env.example', '.gitignore', '.dockerfile', '.sql',
    '.xml', '.svg', '.proto', '.gradle', '.lock',
  ])

  let extensions = textExtensions
  if (includeExtensions && includeExtensions.length > 0) {
    extensions = new Set(includeExtensions.map(e => e.startsWith('.') ? e.toLowerCase() : '.' + e.toLowerCase()))
  }
  if (excludeExtensions && excludeExtensions.length > 0) {
    const excluded = new Set(excludeExtensions.map(e => e.startsWith('.') ? e.toLowerCase() : '.' + e.toLowerCase()))
    extensions = new Set([...extensions].filter(e => !excluded.has(e)))
  }

  const normalizedTreePath = treePath.replace(/^\/+/, '').replace(/\/+$/, '')
  const scoped = analyzeAllSkills
    ? selectSkillEntryBlobs(treeData.tree || [], MAX_BATCH_SKILLS)
    : scopeSkillBlobs(treeData.tree || [], normalizedTreePath)
  const filtered = scoped.filter(item => !shouldIgnore(item.path, ignorePaths))

  const MAX_TOTAL_SIZE = 10 * 1024 * 1024
  const ref = sha || branch

  if (normalizedTreePath && filtered.length === 0) {
    return notFound('Skill path not found in repository')
  }

  const relevant = analyzeAllSkills
    ? filtered
    : selectValidationBlobs(filtered, {
        allowedExtensions: extensions,
        maxFiles: MAX_VALIDATION_FILES,
      })

  const results: PromiseSettledResult<{ path: string; content: string } | null>[] = []
  // ponytail: bounded batches avoid a custom queue; paginate if repositories exceed 1,000 skills.
  for (let index = 0; index < relevant.length; index += 40) {
    const batch = await Promise.allSettled(
      relevant.slice(index, index + 40).map(async (blob: GitHubTreeNode) => {
      const ext = '.' + blob.path.split('.').pop()?.toLowerCase()
      if (!extensions.has(ext) && !blob.path.endsWith('SKILL.md')) return null

      const rawRes = await fetchWithTimeout(
        `/${owner}/${repo}/${ref}/${blob.path}`, {}, FETCH_TIMEOUT, 'raw'
      )
      if (!rawRes.ok) return null
      const text = await rawRes.text()
      if (text.length > 3 * 1024 * 1024) return null
      return { path: blob.path, content: text }
      })
    )
    results.push(...batch)
  }

  let totalSize = 0
  let sizeTruncated = false

  const files = results
    .filter((r): r is PromiseFulfilledResult<{ path: string; content: string }> => r.status === 'fulfilled' && r.value !== null)
    .map(r => r.value)
    .filter(file => {
      if (totalSize + file.content.length > MAX_TOTAL_SIZE) {
        sizeTruncated = true
        return false
      }
      totalSize += file.content.length
      return true
    })

  const fileCountTrimmed = analyzeAllSkills
    ? discoveredSkillCount > relevant.length
    : filtered.length > relevant.length
  const truncated = fileCountTrimmed || sizeTruncated
  if (analyzeAllSkills && files.length !== discoveredSkillCount) {
    return serverError(`Could not fetch all ${discoveredSkillCount} discovered skills. Try again.`)
  }
  const response: Record<string, unknown> = {
    files,
    owner,
    repo,
    branch,
    sha,
    path: normalizedTreePath,
    truncated,
    repositoryAudit,
    repositoryMeta,
    analyzeAllSkills,
    skillCount: files.length,
  }
  if (fileCountTrimmed && sizeTruncated) {
    response.warning = `Large repository detected. Validation used the top ${relevant.length} relevant text files and trimmed oversized content. Repository install-surface audit still covered the full tree.`
  } else if (fileCountTrimmed) {
    response.warning = `Large repository detected. Validation used the top ${relevant.length} relevant text files while the repository install-surface audit still covered the full tree.`
  } else if (sizeTruncated) {
    response.warning = 'Response truncated: total content exceeded 10MB limit'
  }

  return Response.json(response)
}

async function fetchRepositoryMeta(owner: string, repo: string): Promise<RepositoryMeta | undefined> {
  const repoRes = await fetchWithTimeout(`/repos/${owner}/${repo}`)
  if (!repoRes.ok) return undefined

  const repoData = await repoRes.json()

  return {
    fullName: repoData.full_name || `${owner}/${repo}`,
    description: repoData.description || undefined,
    isPrivate: Boolean(repoData.private),
    stars: typeof repoData.stargazers_count === 'number' ? repoData.stargazers_count : 0,
    forks: typeof repoData.forks_count === 'number' ? repoData.forks_count : 0,
    openIssues: typeof repoData.open_issues_count === 'number' ? repoData.open_issues_count : 0,
    archived: Boolean(repoData.archived),
    defaultBranch: repoData.default_branch || undefined,
    updatedAt: repoData.updated_at || undefined,
    pushedAt: repoData.pushed_at || undefined,
    license: repoData.license?.spdx_id || repoData.license?.name || undefined,
  }
}

async function fetchRepositoryAuditFiles(
  owner: string,
  repo: string,
  ref: string,
  treeData: { tree: GitHubTreeNode[] }
): Promise<Array<{ path: string; content: string }>> {
  const candidatePaths = (treeData.tree || [])
    .filter((item: GitHubTreeNode) => item.type === 'blob')
    .map((item) => item.path)
    .filter((path) => isRepositoryAuditCandidatePath(path))
    .slice(0, 40)

  const fetched = await Promise.allSettled(
    candidatePaths.map(async (path) => {
      const rawRes = await fetchWithTimeout(
        `/${owner}/${repo}/${ref}/${path}`, {}, FETCH_TIMEOUT, 'raw'
      )

      if (!rawRes.ok) return null

      const text = await rawRes.text()
      if (text.length > 256 * 1024) return null

      return { path, content: text }
    })
  )

  return fetched
    .filter((result): result is PromiseFulfilledResult<{ path: string; content: string }> => result.status === 'fulfilled' && result.value !== null)
    .map((result) => result.value)
}
