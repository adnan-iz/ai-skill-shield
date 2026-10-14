import type { ScanCoverage, SkillInput } from './types'

export function scanCoverage(input: SkillInput): ScanCoverage {
  const raw = input.coverage
  const valid = raw && ['complete', 'partial', 'unknown'].includes(raw.status) && Number.isSafeInteger(raw.discoveredFiles) && raw.discoveredFiles >= 0 && Array.isArray(raw.skippedFiles) && raw.skippedFiles.every(item => item && typeof item.path === 'string' && typeof item.reason === 'string')
  const skippedFiles = valid ? raw.skippedFiles.slice(0, 1000).flatMap(item =>
    item && typeof item.path === 'string' && typeof item.reason === 'string' ? [{ path: item.path.slice(0, 1000), reason: item.reason.slice(0, 200) }] : []
  ) : []
  return {
    status: raw && (!valid || raw.status === 'unknown') ? 'unknown' : skippedFiles.length || raw?.status === 'partial' || (valid && raw.discoveredFiles > input.files.length) ? 'partial' : 'complete',
    discoveredFiles: Math.max(input.files.length, valid ? raw.discoveredFiles : 0),
    inspectedFiles: input.files.length,
    skippedFiles,
  }
}
