import fs from 'node:fs'
import path from 'node:path'
import { runSecurityScan, SECURITY_ENGINE_VERSION } from '../../core/src/shared-security'
import { sourceHash, findingFingerprint, validateBaseline, type Baseline } from '../../core/src/baseline'
import type { Finding, SkillFile, Severity, ScanCoverage } from '../../../lib/validator/types'
import { scanDependencyAdvisories } from '../../../lib/validator/dependency-advisories'
import { parseFrontmatter } from '../../../lib/parser/frontmatter'

export const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
export interface LocalResult {
  score: number
  riskLevel: string
  verdict: 'Do Not Install' | 'Needs Manual Review' | 'Safe to Review'
  name: string
  description: string
  findings: Finding[]
  activeFindings: Finding[]
  suppressedFindings: { finding: Finding; reason: string }[]
  coverage: ScanCoverage
  sourceHash: string
  engineVersion: string
  dependencyAdvisories?: { status: 'complete' | 'unavailable'; checkedPackages: number }
}
export function getLocalVerdict(result: Pick<LocalResult, 'activeFindings' | 'coverage' | 'dependencyAdvisories'>): LocalResult['verdict'] {
  if (result.activeFindings.some(f => f.severity === 'critical')) return 'Do Not Install'
  if (result.coverage.status !== 'complete' || result.dependencyAdvisories?.status === 'unavailable' || result.activeFindings.some(f => f.severity === 'high' || f.severity === 'medium')) return 'Needs Manual Review'
  return 'Safe to Review'
}
function withVerdict(result: Omit<LocalResult, 'verdict'>): LocalResult {
  return { ...result, verdict: getLocalVerdict(result) }
}
export function readLocalFiles(directory: string) {
  const root = path.resolve(directory)
  if (root.startsWith('\\\\')) throw new Error('Remote or device paths are not supported; choose a local directory')
  if (!fs.lstatSync(root).isDirectory() || fs.lstatSync(root).isSymbolicLink()) throw new Error('Skill path must be a real directory')
  const files: SkillFile[] = []
  const coverage: ScanCoverage = { status: 'complete', discoveredFiles: 0, inspectedFiles: 0, skippedFiles: [] }
  let bytes = 0
  let entries = 0
  const skip = (p: string, reason: string) => { coverage.status = 'partial'; coverage.skippedFiles.push({ path: p, reason }) }
  function walk(dir: string, depth: number) {
    if (depth > 32) { skip(path.relative(root, dir), 'depth-limit'); return }
    // Read incrementally so a directory with millions of entries cannot exhaust memory.
    const handle = fs.opendirSync(dir)
    try {
      let entry
      while ((entry = handle.readSync())) {
        const full = path.join(dir, entry.name)
        const relative = path.relative(root, full).replace(/\\/g, '/')
        if (++entries > 10000) { skip(relative, 'entry-limit'); return }
        try {
          const stat = fs.lstatSync(full)
          if (stat.isSymbolicLink()) { coverage.discoveredFiles++; skip(relative, 'symlink'); continue }
          if (stat.isDirectory()) {
            if (['node_modules', '.git', '.next', 'vendor', 'dist', 'build'].includes(entry.name)) skip(relative, 'dependency-or-generated-directory')
            else walk(full, depth + 1)
            continue
          }
          coverage.discoveredFiles++
          if (!stat.isFile()) { skip(relative, 'non-regular-file'); continue }
          if (stat.size > 1024 * 1024 || bytes + stat.size > 16 * 1024 * 1024 || files.length >= 1000) { skip(relative, 'size-or-file-limit'); continue }
          const fd = fs.openSync(full, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0))
          let data: Buffer
          try {
            const opened = fs.fstatSync(fd)
            if (!opened.isFile() || opened.ino !== stat.ino || opened.dev !== stat.dev || opened.size > 1024 * 1024) { skip(relative, 'file-changed'); continue }
            data = Buffer.alloc(Math.min(opened.size + 1, 1024 * 1024 + 1))
            let length = 0
            while (length < data.length) {
              const read = fs.readSync(fd, data, length, data.length - length, length)
              if (!read) break
              length += read
            }
            const after = fs.fstatSync(fd)
            if (length !== opened.size || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) { skip(relative, 'file-changed-or-short-read'); continue }
            data = data.subarray(0, length)
          } finally { fs.closeSync(fd) }
          bytes += data.length
          if (data.length > 1024 * 1024) { skip(relative, 'size-limit'); continue }
          let content: string
          try { content = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data) } catch { skip(relative, 'binary-or-invalid-utf8'); continue }
          if (content.includes('\0')) { skip(relative, 'binary'); continue }
          files.push({ path: relative, content })
          coverage.inspectedFiles++
        } catch { skip(relative, 'read-failed') }
      }
    } finally { handle.closeSync() }
  }
  walk(root, 0)
  return { files, coverage }
}
export function scanLocalSkill(directory: string): LocalResult {
  const { files, coverage } = readLocalFiles(directory)
  return scanFiles(directory, files, coverage)
}
function scanFiles(directory: string, files: SkillFile[], coverage: ScanCoverage): LocalResult {
  const content = files.find(f => f.path === 'SKILL.md')?.content
  if (!content) throw new Error('A readable, nonempty SKILL.md is required')
  const security = runSecurityScan(files, content)
  const metadata = parseFrontmatter(content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')).frontmatter
  const findings = security.findings
  const riskLevel = severities.find(s => findings.some(f => f.severity === s)) || 'safe'
  return withVerdict({ score: security.score, riskLevel, name: typeof metadata.name === 'string' ? metadata.name : path.basename(path.resolve(directory)), description: typeof metadata.description === 'string' ? metadata.description : '', findings, activeFindings: findings, suppressedFindings: [], coverage, sourceHash: sourceHash(files), engineVersion: SECURITY_ENGINE_VERSION })
}
export async function scanLocalSkillWithOptions(directory: string, dependencies = false): Promise<LocalResult> {
  const { files, coverage } = readLocalFiles(directory)
  const result = scanFiles(directory, files, coverage)
  if (!dependencies) return result
  const advisory = await scanDependencyAdvisories(files)
  const findings = [...result.findings, ...advisory.findings]
  const score = Math.max(0, 100 - findings.reduce((sum, f) => sum + ({ critical: 50, high: 25, medium: 10, low: 5, info: 0 }[f.severity]), 0))
  return withVerdict({ ...result, findings, activeFindings: findings, score, riskLevel: severities.find(s => findings.some(f => f.severity === s)) || 'safe', dependencyAdvisories: { status: advisory.status, checkedPackages: advisory.checkedPackages } })
}
export function createBaseline(result: LocalResult, reason: string): Baseline {
  if (!reason.trim()) throw new Error('Baseline acceptance requires a reason')
  if (result.coverage.status !== 'complete' || result.dependencyAdvisories?.status === 'unavailable') throw new Error('Cannot accept a baseline with incomplete coverage')
  return { version: 1, engineVersion: result.engineVersion, sourceHash: result.sourceHash, entries: result.findings.map(f => ({ fingerprint: findingFingerprint(f), reason })) }
}
export function applyBaseline(result: LocalResult, baseline: unknown): LocalResult {
  validateBaseline(baseline)
  if (baseline.sourceHash !== result.sourceHash) return result
  const accepted = new Map(baseline.entries.map(e => [e.fingerprint, e.reason]))
  return withVerdict({ ...result, activeFindings: result.findings.filter(f => !accepted.has(findingFingerprint(f))), suppressedFindings: result.findings.filter(f => accepted.has(findingFingerprint(f))).map(finding => ({ finding, reason: accepted.get(findingFingerprint(finding))! })) })
}
export function baselinePath(directory: string, filename: string): string {
  const root = path.resolve(directory)
  const resolved = path.resolve(filename)
  const parent = fs.realpathSync(path.dirname(resolved))
  const actual = fs.existsSync(resolved) ? fs.realpathSync(resolved) : path.join(parent, path.basename(resolved))
  const relative = path.relative(fs.realpathSync(root), actual)
  if (!relative || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Store the baseline outside the scanned skill directory')
  return resolved
}
export function readBaseline(directory: string, filename: string): unknown {
  const resolved = baselinePath(directory, filename)
  const stat = fs.lstatSync(resolved)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) throw new Error('Baseline must be a regular JSON file no larger than 1 MiB')
  const fd = fs.openSync(resolved, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0))
  try {
    const data = Buffer.alloc(1024 * 1024 + 1)
    let length = 0
    while (length < data.length) {
      const read = fs.readSync(fd, data, length, data.length - length, length)
      if (!read) break
      length += read
    }
    if (length > 1024 * 1024) throw new Error('Baseline exceeds size limit')
    return JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(data.subarray(0, length)))
  } finally { fs.closeSync(fd) }
}
export function shouldFail(result: LocalResult, severity: string, failOnIncomplete: boolean): boolean {
  if (!severities.includes(severity as Severity)) throw new Error('Unknown fail-on severity')
  return (failOnIncomplete && (result.coverage.status !== 'complete' || result.dependencyAdvisories?.status === 'unavailable')) || result.activeFindings.some(f => severities.indexOf(f.severity) <= severities.indexOf(severity as Severity))
}
