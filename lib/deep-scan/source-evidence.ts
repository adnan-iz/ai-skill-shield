import { createHash } from 'node:crypto'
import type { SkillFile } from '@/lib/validator/types'

export function sourceEvidence(files: SkillFile[]) {
  return files.map(file => ({ path: file.path, bytes: Buffer.byteLength(file.content), sha256: createHash('sha256').update(file.content).digest('hex') }))
}
