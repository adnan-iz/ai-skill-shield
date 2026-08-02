export const VALID_OWNER_REPO = /^[a-zA-Z0-9_.-]+$/
export const VALID_ID = /^[a-zA-Z0-9-]+$/
export const VALID_SLUG = /^[a-zA-Z0-9_.\-/]+$/
export const VALID_BRANCH = /^[a-zA-Z0-9._\-\/]+$/
export const VALID_COMMIT_SHA = /^[0-9a-f]{7,40}$/

export const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3MB per file
export const MAX_TOTAL_SIZE = 15 * 1024 * 1024 // 15MB total
export const MAX_FILES = 30
// ponytail: bounded bulk scan; paginate inputs before raising this ceiling.
export const MAX_BATCH_SKILLS = 1000

export function validateOwnerRepo(owner: string, repo: string): string | null {
  if (!owner || !VALID_OWNER_REPO.test(owner)) return 'Invalid owner'
  if (!repo || !VALID_OWNER_REPO.test(repo)) return 'Invalid repo'
  return null
}

export function validateId(id: string): string | null {
  if (!id || !VALID_ID.test(id)) return 'Invalid id'
  return null
}

export function validatePayloadSize(body: string): string | null {
  if (body.length > MAX_TOTAL_SIZE) return `Payload too large (max ${MAX_TOTAL_SIZE / 1024 / 1024}MB)`
  return null
}

export function validateFiles(
  files: { path: string; content: string }[]
): string | null {
  if (!Array.isArray(files)) return 'files must be an array'
  if (files.length === 0) return 'Provide at least one file'
  const allSkillFiles = files.every((file) => typeof file.path === 'string' && /(^|\/)SKILL\.md$/i.test(file.path.replace(/\\/g, '/')))
  const maxFiles = allSkillFiles ? MAX_BATCH_SKILLS : MAX_FILES
  if (files.length > maxFiles) return `Too many files (max ${maxFiles})`

  for (const file of files) {
    if (typeof file.path !== 'string' || typeof file.content !== 'string') {
      return 'Invalid file format'
    }
    if (file.path.includes('..') || file.path.startsWith('/')) {
      return 'Invalid file path'
    }
    if (file.content.length > MAX_FILE_SIZE) {
      return `File too large: ${file.path} (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`
    }
    if (isBinaryContent(file.content)) {
      return `Binary file detected: ${file.path}`
    }
  }

  return null
}

export function isBinaryContent(content: string): boolean {
  const sample = content.slice(0, 4096)
  return sample.includes('\x00')
}

export function validateBranch(branch: string): string | null {
  if (!branch) return null
  if (branch.length > 250) return 'Branch name too long'
  if (!VALID_BRANCH.test(branch)) return 'Invalid branch name'
  if (branch.includes('..') || branch.startsWith('/') || branch.endsWith('/')) return 'Invalid branch name'
  return null
}

export function validateCommitSha(sha: string): string | null {
  if (!sha) return null
  if (!VALID_COMMIT_SHA.test(sha)) return 'Invalid commit SHA (expected 7-40 hex characters)'
  return null
}

export function sanitizeError(message: string): string {
  return message.replace(/https?:\/\/[^\s]+/g, '[redacted]')
}
