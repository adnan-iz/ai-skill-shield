import type { GitHubTreeNode } from '@/lib/github/repository-audit'
import { isRepositoryAuditCandidatePath } from '@/lib/github/repository-audit'

export function normalizeSkillDirectoryPath(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')
  if (!/(^|\/)SKILL\.md$/i.test(normalized)) return normalized
  return normalized.split('/').slice(0, -1).join('/')
}

export function listSkillDirectories(tree: GitHubTreeNode[]): string[] {
  return Array.from(new Set(
    tree
      .filter((item) => item.type === 'blob' && /(^|\/)SKILL\.md$/i.test(item.path))
      .map((item) => normalizeSkillDirectoryPath(item.path))
  )).sort((a, b) => a.localeCompare(b))
}

export function scopeSkillBlobs(tree: GitHubTreeNode[], targetPath: string): GitHubTreeNode[] {
  const normalizedTarget = normalizeSkillDirectoryPath(targetPath)
  const blobs = tree.filter((item) => item.type === 'blob')
  const withinTarget = normalizedTarget
    ? blobs.filter((item) => item.path === normalizedTarget || item.path.startsWith(`${normalizedTarget}/`))
    : blobs
  const nestedSkills = listSkillDirectories(tree).filter((directory) =>
    directory !== normalizedTarget &&
    (normalizedTarget ? directory.startsWith(`${normalizedTarget}/`) : directory.length > 0)
  )

  return withinTarget.filter((item) => !nestedSkills.some((directory) =>
    item.path === directory || item.path.startsWith(`${directory}/`)
  ))
}

function fileExtension(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  const baseName = lastSlash >= 0 ? path.slice(lastSlash + 1) : path
  const lastDot = baseName.lastIndexOf('.')
  if (lastDot < 0) return ''
  return baseName.slice(lastDot).toLowerCase()
}

function scoreBlobPath(path: string): number {
  const normalized = path.replace(/\\/g, '/')
  const depth = normalized.split('/').length
  let score = Math.max(0, 180 - depth * 12)

  if (/^SKILL\.md$/i.test(normalized) || /\/SKILL\.md$/i.test(normalized)) score += 1200
  if (/^package\.json$/i.test(normalized) || /\/package\.json$/i.test(normalized)) score += 1000
  if (/^README(\.[a-z0-9]+)?$/i.test(normalized) || /\/README(\.[a-z0-9]+)?$/i.test(normalized)) score += 920
  if (/^pnpm-workspace\.ya?ml$/i.test(normalized)) score += 760
  if (/^turbo\.json$/i.test(normalized)) score += 720
  if (/^\.github\/workflows\/.+\.(yml|yaml)$/i.test(normalized)) score += 900
  if (isRepositoryAuditCandidatePath(normalized)) score += 860
  if (/^docs\//i.test(normalized)) score += 120
  if (/^examples?\//i.test(normalized) || /^samples?\//i.test(normalized)) score += 100

  const ext = fileExtension(normalized)
  if (['.md', '.json', '.yaml', '.yml', '.toml', '.env', '.txt', '.sh', '.ps1', '.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
    score += 140
  }

  return score
}

export function selectValidationBlobs(
  blobs: GitHubTreeNode[],
  {
    allowedExtensions,
    maxFiles,
  }: {
    allowedExtensions: Set<string>
    maxFiles: number
  }
): GitHubTreeNode[] {
  const candidates = blobs.filter((blob) => {
    const normalized = blob.path.replace(/\\/g, '/')
    const ext = fileExtension(normalized)

    if (/SKILL\.md$/i.test(normalized)) return true
    if (/^\.github\/workflows\/.+\.(yml|yaml)$/i.test(normalized)) return true
    if (isRepositoryAuditCandidatePath(normalized)) return true
    return ext !== '' && allowedExtensions.has(ext)
  })

  return candidates
    .map((blob) => ({ blob, score: scoreBlobPath(blob.path) }))
    .sort((a, b) => b.score - a.score || a.blob.path.localeCompare(b.blob.path))
    .slice(0, maxFiles)
    .map((entry) => entry.blob)
}
