import { VALID_SLUG, validateOwnerRepo } from '@/lib/security/input-validation'
import type { SkillSource, ValidationResult } from '@/lib/validator/types'

export interface GitHubTrustTarget {
  owner: string
  repo: string
  path: string
}

export function normalizeGitHubSkillPath(path?: string | string[]): string {
  const raw = Array.isArray(path) ? path.join('/') : path || ''
  return raw.split('/').filter(Boolean).join('/')
}

export function parseGitHubTrustTarget(
  owner: string,
  repo: string,
  path?: string | string[]
): GitHubTrustTarget | null {
  const normalizedPath = normalizeGitHubSkillPath(path)
  if (
    owner.length > 100 ||
    repo.length > 100 ||
    normalizedPath.length > 1000 ||
    validateOwnerRepo(owner, repo) ||
    (normalizedPath && (!VALID_SLUG.test(normalizedPath) || normalizedPath.split('/').includes('..')))
  ) {
    return null
  }

  return { owner, repo, path: normalizedPath }
}

function artifactPath(prefix: string, target: GitHubTrustTarget): string {
  const path = target.path
    ? `/${target.path.split('/').map(encodeURIComponent).join('/')}`
    : ''
  return `${prefix}/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}${path}`
}

export function githubTrustPath(target: GitHubTrustTarget): string {
  return artifactPath('/trust/github', target)
}

export function githubBadgePath(target: GitHubTrustTarget): string {
  return `${artifactPath('/api/badge/github', target)}?v=2`
}

export function githubTrustImagePath(target: GitHubTrustTarget): string {
  return artifactPath('/api/og/trust/github', target)
}

export function trustTargetForSource(source?: SkillSource): GitHubTrustTarget | null {
  if (
    source?.type !== 'github' ||
    !source.owner ||
    !source.repo ||
    !source.sha ||
    source.repositoryMeta?.isPrivate !== false ||
    source.repositoryMeta.isDefaultBranchHead !== true
  ) {
    return null
  }

  return parseGitHubTrustTarget(source.owner, source.repo, source.path)
}

export function trustTargetForResult(result: ValidationResult): GitHubTrustTarget | null {
  return trustTargetForSource(result.source)
}
