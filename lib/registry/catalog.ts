import { randomUUID } from 'node:crypto'
import { verifySkillPackage } from '@/lib/signing'
import { runFullValidation } from '@/lib/validator/orchestrator'
import { parseFrontmatter } from '@/lib/parser/frontmatter'
import type { PublishRequest, RegistrySkill } from './types'

// In-memory catalog storage
const catalog: RegistrySkill[] = []

/**
 * Publishes a skill to the Golden Skill Registry after cryptographic signature
 * verification and automated security/quality validation.
 */
export async function publishSkill(
  request: PublishRequest
): Promise<{ success: boolean; skill?: RegistrySkill; error?: string }> {
  if (!request || !request.files || !Array.isArray(request.files) || request.files.length === 0) {
    return { success: false, error: 'Files are required for publishing a skill' }
  }

  if (!request.signature) {
    return { success: false, error: 'Cryptographic signature is required for publishing' }
  }

  if (!request.author) {
    return { success: false, error: 'Author is required for publishing' }
  }

  // 1. Cryptographically verify signature against files
  const verification = await verifySkillPackage(request.files, request.signature)
  if (!verification.isValid) {
    return {
      success: false,
      error: verification.error || 'Cryptographic signature verification failed: skill package invalid or tampered',
    }
  }

  // 2. Run full validation on files
  const validation = await runFullValidation({ files: request.files })

  // 3. Reject publication if validation discovers critical security risks
  if (validation.riskLevel === 'critical') {
    return {
      success: false,
      error: 'Skill publication rejected: critical security vulnerabilities detected during validation',
    }
  }

  // 4. Extract metadata from SKILL.md or frontmatter
  const skillFile = request.files.find(f => /(^|\/)SKILL\.md$/i.test(f.path.replace(/\\/g, '/')))
  let frontmatter: Record<string, unknown> = {}
  if (skillFile) {
    frontmatter = parseFrontmatter(skillFile.content).frontmatter
  } else if (validation.skillPreview?.frontmatter) {
    frontmatter = validation.skillPreview.frontmatter
  }

  const name = (frontmatter.name as string) || validation.skillName || 'unnamed-skill'
  const version = (frontmatter.version as string) || '1.0.0'
  const description = (frontmatter.description as string) || ''

  const tags: string[] = request.tags && Array.isArray(request.tags)
    ? [...request.tags]
    : Array.isArray(frontmatter.tags)
    ? (frontmatter.tags as string[])
    : []

  const skill: RegistrySkill = {
    id: randomUUID(),
    name,
    version,
    description,
    author: request.author,
    publishedAt: new Date().toISOString(),
    signature: request.signature,
    validationSummary: {
      overallScore: validation.overallScore,
      riskLevel: validation.riskLevel,
      cacheEfficiencyScore: validation.tokenAnalysis?.cacheEfficiencyScore,
    },
    tags,
    downloadCount: 0,
    isDeprecated: false,
  }

  const existingIndex = catalog.findIndex(s => s.name === skill.name && s.version === skill.version)
  if (existingIndex >= 0) {
    catalog[existingIndex] = skill
  } else {
    catalog.push(skill)
  }

  return { success: true, skill }
}

/**
 * Lists registered skills, with optional filtering by tag, text query, and deprecation status.
 */
export function listSkills(filter?: {
  tag?: string
  query?: string
  includeDeprecated?: boolean
}): RegistrySkill[] {
  let results = [...catalog]

  if (!filter?.includeDeprecated) {
    results = results.filter(s => !s.isDeprecated)
  }

  if (filter?.tag) {
    const targetTag = filter.tag.trim().toLowerCase()
    results = results.filter(s => s.tags.some(t => t.toLowerCase() === targetTag))
  }

  if (filter?.query) {
    const q = filter.query.trim().toLowerCase()
    results = results.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.author.toLowerCase().includes(q) ||
      s.tags.some(t => t.toLowerCase().includes(q))
    )
  }

  return results
}

/**
 * Retrieves a skill by name, optionally matching a specific version.
 * If version is omitted, returns the latest registered skill with that name.
 */
export function getSkillByName(name: string, version?: string): RegistrySkill | null {
  if (version) {
    return catalog.find(s => s.name === name && s.version === version) || null
  }
  const matching = catalog.filter(s => s.name === name)
  if (matching.length === 0) return null
  return matching[matching.length - 1]
}

/**
 * Marks a specific skill version as deprecated with a reason.
 */
export function deprecateSkill(name: string, version: string, reason: string): boolean {
  const skill = catalog.find(s => s.name === name && s.version === version)
  if (!skill) return false
  skill.isDeprecated = true
  skill.deprecationReason = reason
  return true
}

/**
 * Clears the registry catalog (for testing).
 */
export function clearCatalog(): void {
  catalog.length = 0
}
