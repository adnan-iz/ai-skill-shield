import type { GitHubTreeNode } from '@/lib/github/repository-audit'

export function normalizeSkillPath(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase()
}

export function slugVariants(skillName: string): string[] {
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
