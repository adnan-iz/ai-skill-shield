import type { FindingIndex } from './finding-key'

export const MAX_CANDIDATE_CLAIMS = 20

export interface CandidateClaim {
  findingKey: string
  claim: string
}

function isCandidateClaim(value: unknown): value is CandidateClaim {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.findingKey === 'string' && candidate.findingKey.length > 0 &&
    typeof candidate.claim === 'string' && candidate.claim.trim().length > 0
}

/**
 * Keeps only unique claims for findings in the immutable scan-derived index.
 * A batch over the review limit is rejected as a whole so an extractor cannot
 * select a convenient subset by overflowing the boundary.
 */
export function validateCandidateClaims(candidates: unknown, index: FindingIndex): CandidateClaim[] {
  if (!Array.isArray(candidates) || candidates.length > MAX_CANDIDATE_CLAIMS) return []

  const seen = new Set<string>()
  const valid: CandidateClaim[] = []
  for (const candidate of candidates) {
    if (!isCandidateClaim(candidate) || !index.has(candidate.findingKey) || seen.has(candidate.findingKey)) continue
    seen.add(candidate.findingKey)
    valid.push({ findingKey: candidate.findingKey, claim: candidate.claim.trim() })
  }
  return valid
}
