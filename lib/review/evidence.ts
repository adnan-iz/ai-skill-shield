import { githubRequest } from '@/lib/github/app-client'
import type { Finding, ValidationResult } from '@/lib/validator/types'
import { validateCandidateClaims } from './claims'
import { indexFindings } from './finding-key'

const MAX_FILE_BYTES = 256 * 1024
const MAX_EVIDENCE_BYTES = 16 * 1024
const MAX_REVIEW_EVIDENCE_BYTES = 128 * 1024
const CONTEXT_LINES = 20
const FULL_SHA = /^[0-9a-f]{40}$/i
const GITHUB_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/

type GitHubRequest = typeof githubRequest

export interface ExactFileEvidence {
  filePath: string
  startLine: number
  endLine: number
  content: string
  contentType: 'text/plain; charset=utf-8'
}

export interface CollectedEvidence {
  findingKey: string
  claim: string
  finding: Finding
  evidence: ExactFileEvidence | null
}

function normalizedRelativePath(value: string): string | null {
  if (!value || value.length > 1_000 || value.includes('\0')) return null
  const normalized = value.replaceAll('\\', '/')
  if (normalized.startsWith('/') || normalized.endsWith('/') || normalized.includes('//')) return null
  const parts = normalized.split('/')
  if (parts.some((part) => !part || part === '.' || part === '..')) return null
  return parts.join('/')
}

function sourceForExactCommit(scan: Pick<ValidationResult, 'source'>): { owner: string; repo: string; rootPath: string; sha: string } | null {
  const source = scan.source
  if (
    source?.type !== 'github' ||
    !source.owner || !source.repo || !source.sha ||
    !GITHUB_IDENTIFIER.test(source.owner) || !GITHUB_IDENTIFIER.test(source.repo) ||
    !FULL_SHA.test(source.sha)
  ) return null

  let rootPath = ''
  if (source.path) {
    const normalizedPath = normalizedRelativePath(source.path)
    if (!normalizedPath) return null
    rootPath = normalizedPath
  }
  return { owner: source.owner, repo: source.repo, rootPath, sha: source.sha }
}

/** Resolves a finding path inside, never outside, the original scanned skill directory. */
function scannedFilePath(rootPath: string, findingPath: string | undefined): string | null {
  const filePath = normalizedRelativePath(findingPath || 'SKILL.md')
  if (!filePath) return null
  if (!rootPath) return filePath
  if (filePath === rootPath || filePath.startsWith(`${rootPath}/`)) return filePath
  return `${rootPath}/${filePath}`
}

function strictBase64(value: string): Buffer | null {
  const compact = value.replace(/[\r\n\t ]/g, '')
  if (!compact || compact.length % 4 !== 0 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) return null
  const decoded = Buffer.from(compact, 'base64')
  return decoded.toString('base64') === compact ? decoded : null
}

function decodeText(content: string): string | null {
  const bytes = strictBase64(content)
  if (!bytes || bytes.byteLength > MAX_FILE_BYTES || bytes.includes(0)) return null
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return /[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/.test(text) ? null : text
  } catch {
    return null
  }
}

function bytes(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}

function truncateUtf8(value: string, maxBytes: number): string {
  if (bytes(value) <= maxBytes) return value
  let end = value.length
  while (end > 0 && bytes(value.slice(0, end)) > maxBytes) end--
  return value.slice(0, end)
}

function boundedWindow(text: string, lineNumber: number | undefined, maxBytes: number): Pick<ExactFileEvidence, 'startLine' | 'endLine' | 'content'> {
  const lines = text.split(/\r?\n/)
  const targetIndex = Math.min(Math.max((lineNumber || 1) - 1, 0), Math.max(lines.length - 1, 0))
  let start = Math.max(0, targetIndex - CONTEXT_LINES)
  let end = Math.min(lines.length - 1, targetIndex + CONTEXT_LINES)
  let content = lines.slice(start, end + 1).join('\n')

  while (bytes(content) > maxBytes && start < end) {
    if (targetIndex - start >= end - targetIndex) start++
    else end--
    content = lines.slice(start, end + 1).join('\n')
  }
  if (bytes(content) > maxBytes) content = truncateUtf8(content, maxBytes)
  return { startLine: start + 1, endLine: end + 1, content }
}

/**
 * Retrieves one evidence window from the scan's stored GitHub source. It does
 * not accept a commenter URL, branch, or ref, and it treats response data only
 * as bounded text.
 */
export async function fetchExactFile(
  scan: Pick<ValidationResult, 'source'>,
  finding: Pick<Finding, 'filePath' | 'lineNumber'>,
  request: GitHubRequest = githubRequest,
  maxEvidenceBytes = MAX_EVIDENCE_BYTES,
): Promise<ExactFileEvidence | null> {
  const source = sourceForExactCommit(scan)
  const filePath = source && scannedFilePath(source.rootPath, finding.filePath)
  if (!source || !filePath || !Number.isInteger(maxEvidenceBytes) || maxEvidenceBytes < 1) return null

  let response: Response
  try {
    response = await request(
      source.owner,
      source.repo,
      `/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(source.sha)}`,
    )
  } catch {
    return null
  }
  if (!response.ok) return null

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return null
  }
  if (!payload || typeof payload !== 'object') return null
  const file = payload as { encoding?: unknown; content?: unknown; size?: unknown; type?: unknown }
  if (file.type !== undefined && file.type !== 'file') return null
  if (file.encoding !== 'base64' || typeof file.content !== 'string') return null
  if (typeof file.size === 'number' && (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_FILE_BYTES)) return null

  const text = decodeText(file.content)
  if (text === null) return null
  return {
    filePath,
    ...boundedWindow(text, finding.lineNumber, Math.min(MAX_EVIDENCE_BYTES, maxEvidenceBytes)),
    contentType: 'text/plain; charset=utf-8',
  }
}

/** Collects bounded evidence only for scan-indexed, model-selected findings. */
export async function collectEvidence(
  scan: ValidationResult,
  candidates: unknown,
  request: GitHubRequest = githubRequest,
): Promise<CollectedEvidence[]> {
  const index = indexFindings(scan)
  const claims = validateCandidateClaims(candidates, index)
  const collected: CollectedEvidence[] = []
  let totalBytes = 0

  for (const claim of claims) {
    const finding = index.get(claim.findingKey)
    if (!finding) continue
    if (totalBytes >= MAX_REVIEW_EVIDENCE_BYTES) {
      collected.push({ ...claim, finding, evidence: null })
      continue
    }
    const evidence = await fetchExactFile(scan, finding, request, Math.min(MAX_EVIDENCE_BYTES, MAX_REVIEW_EVIDENCE_BYTES - totalBytes))
    if (evidence) totalBytes += bytes(evidence.content)
    collected.push({ ...claim, finding, evidence })
  }
  return collected
}

export const evidenceLimits = {
  maxFileBytes: MAX_FILE_BYTES,
  maxEvidenceBytes: MAX_EVIDENCE_BYTES,
  maxReviewEvidenceBytes: MAX_REVIEW_EVIDENCE_BYTES,
}
