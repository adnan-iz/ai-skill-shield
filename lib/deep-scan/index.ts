import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { redactSecrets } from '@/lib/ai-review'
import type { Finding, SkillFile, SkillSource } from '@/lib/validator/types'

export const SKILLSPECTOR_REVISION = '8b993d32eb66c88496eb5aa5088530ac8b9214d5'
const VERSION = '2.12.0'
let activeScans = 0
const issueSchema = z.object({ id: z.string().min(1), message: z.string().min(1).optional(), severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']), location: z.object({ file: z.string(), start_line: z.number().int().positive(), end_line: z.number().int().positive().nullable().optional() }), evidence: z.record(z.string(), z.unknown()).optional() }).passthrough()
export interface DeepScanResult {
  engine: 'skillspector'
  engineRevision: string
  status: 'complete' | 'partial' | 'unavailable'
  scoreDirection: 'higher-is-worse'
  riskScore?: number
  findings: Finding[]
  issues: Array<z.infer<typeof issueSchema>>
  completeness?: Record<string, unknown>
  engineReport?: Record<string, unknown>
  reason?: string
  sourceMode?: 'stored-text' | 'immutable-github'
}
const unavailable = (reason: string): DeepScanResult => ({ engine: 'skillspector', engineRevision: SKILLSPECTOR_REVISION, status: 'unavailable', scoreDirection: 'higher-is-worse', findings: [], issues: [], reason })

export function parseDeepReport(raw: string, files: SkillFile[], bundle = false): DeepScanResult {
  const sanitized = JSON.parse(JSON.stringify(JSON.parse(raw), (_key, value) => typeof value === 'string' ? redactSecrets(value) : value))
  let multiIncomplete = false
  const expectedSkills = new Set(files.filter(file => /(^|\/)SKILL\.md$/i.test(file.path)).map(file => file.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/')))
  if (expectedSkills.size > 1 && sanitized.multi_skill !== true) multiIncomplete = true
  let projected = sanitized
  if (sanitized.multi_skill === true) {
    const multi = z.object({ skills: z.array(z.record(z.string(), z.unknown())).max(5000), max_risk_score: z.number().min(0).max(100) }).parse(sanitized)
    const issues: unknown[] = []
    const reportedSkills = new Set(multi.skills.map(skill => typeof skill.path === 'string' ? skill.path.replace(/\\/g, '/').replace(/^\.\/?$|\/$/g, '') : ''))
    multiIncomplete = !multi.skills.length || !!sanitized.skills_omitted || !!sanitized.skills_output_omitted
    if ([...expectedSkills].some(directory => !reportedSkills.has(directory))) multiIncomplete = true
    for (const skill of multi.skills) {
      if (skill.error || skill.omitted || !Array.isArray(skill.issues)) { multiIncomplete = true; continue }
      const completeness = skill.analysis_completeness as Record<string, unknown> | undefined
      if (skill.execution_successful !== true || completeness?.status !== 'complete' || completeness?.is_complete === false) multiIncomplete = true
      const prefix = typeof skill.path === 'string' ? skill.path.replace(/\\/g, '/').replace(/^\.\/$|\/$/g, '') : ''
      for (const issue of skill.issues) {
        if (issue && typeof issue === 'object' && issue.location && typeof issue.location.file === 'string') {
          issues.push({ ...issue, location: { ...issue.location, file: prefix && prefix !== '.' ? `${prefix}/${issue.location.file}` : issue.location.file } })
        } else { multiIncomplete = true }
      }
    }
    projected = { ...sanitized, issues, risk_assessment: { score: multi.max_risk_score } }
  }
  const data = z.object({ issues: z.array(z.unknown()).max(5000), risk_assessment: z.object({ score: z.number().min(0).max(100) }).optional(), execution_successful: z.boolean().optional(), analysis_completeness: z.record(z.string(), z.unknown()).optional() }).parse(projected)
  const result: DeepScanResult = { ...unavailable(''), status: 'complete', riskScore: data.risk_assessment?.score, completeness: data.analysis_completeness, engineReport: sanitized, reason: undefined }
  let invalid = 0
  for (const rawIssue of data.issues) {
    const parsed = issueSchema.safeParse(rawIssue)
    if (!parsed.success) { invalid++; continue }
    const issue = parsed.data
    const location = issue.location
    const sourceFile = files.find(file => file.path === location.file)
    if (location.end_line && location.end_line < location.start_line) { invalid++; continue }
    if (!bundle && (!sourceFile || (location.end_line ?? location.start_line) > sourceFile.content.split('\n').length)) { invalid++; continue }
    result.issues.push(issue)
    const message = issue.message || (typeof issue.explanation === 'string' ? issue.explanation : typeof issue.finding === 'string' ? issue.finding : issue.id)
    result.findings.push({ id: `skillspector-${result.findings.length + 1}`, axis: 'security', severity: issue.severity.toLowerCase() as Finding['severity'], category: 'skillspector', ruleId: issue.id, title: issue.id, message: redactSecrets(message), filePath: location.file, lineNumber: location.start_line, recommendation: typeof issue.remediation === 'string' ? redactSecrets(issue.remediation) : undefined })
  }
  if (multiIncomplete || data.execution_successful !== true || data.analysis_completeness?.status !== 'complete' || data.analysis_completeness?.is_complete === false || !data.risk_assessment || invalid) { result.status = 'partial'; result.reason = 'Engine inspection was incomplete or some issue evidence could not be validated.' }
  return result
}

function run(binary: string, args: string[], cwd: string, timeout: number, allowRiskExit = false): Promise<string> {
  return new Promise((resolve, reject) => execFile(binary, args, { cwd, timeout, maxBuffer: 2_000_000, windowsHide: true, shell: false, env: { ...process.env, PYTHONNOUSERSITE: '1' } }, (error, stdout) => {
    if (error && !(allowRiskExit && error.code === 1 && !error.killed && !error.signal)) reject(error)
    else resolve(stdout)
  }))
}

function safeFilePath(value: string): boolean {
  return value.length <= 500 && !value.includes('\\') && !value.includes(':') && !/[\x00-\x1f]/.test(value) && !path.posix.isAbsolute(value) && value.split('/').every(part => part && part !== '.' && part !== '..' && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part) && !/[. ]$/.test(part))
}

export function immutableGitHubTarget(source?: SkillSource): string | undefined {
  if (source?.type !== 'github' || !/^[A-Za-z0-9_-]+$/.test(source.owner || '') || !/^[A-Za-z0-9_.-]+$/.test(source.repo || '') || !/^[a-f0-9]{40}$/i.test(source.sha || '')) return undefined
  const directory = (source.path || '').replace(/(?:^|\/)SKILL\.md$/i, '')
  if (directory && !safeFilePath(directory)) return undefined
  return `https://github.com/${source.owner}/${source.repo}/tree/${source.sha}${directory ? `/${directory.split('/').map(encodeURIComponent).join('/')}` : ''}`
}

export async function runDeepScan(files: SkillFile[], options: { transitive?: boolean; depth?: number; source?: SkillSource; recursive?: boolean } = {}, env: Record<string, string | undefined> = process.env): Promise<DeepScanResult> {
  const binary = env.SKILLSPECTOR_BIN
  if (!binary || !path.isAbsolute(binary) || env.SKILLSPECTOR_COMMIT !== SKILLSPECTOR_REVISION || !/^[a-f0-9]{64}$/i.test(env.SKILLSPECTOR_BIN_SHA256 || '')) return unavailable('Pinned SkillSpector is not configured. Set SKILLSPECTOR_BIN, SKILLSPECTOR_COMMIT and SKILLSPECTOR_BIN_SHA256.')
  const prefixes = (env.SKILLSPECTOR_TRANSITIVE_PREFIXES || '').split(',').map(value => value.trim()).filter(Boolean)
  if (options.transitive && (!prefixes.length || prefixes.length > 10 || prefixes.some(prefix => !/^https:\/\/github\.com\/[A-Za-z0-9_-]+\/[A-Za-z0-9_.-]+\//.test(prefix) || /[\s?#]/.test(prefix)))) return unavailable('Transitive scans require server-configured GitHub repository prefixes.')
  if (options.depth !== undefined && (!Number.isInteger(options.depth) || options.depth < 1 || options.depth > 2)) return unavailable('Transitive depth must be 1 or 2.')
  const target = immutableGitHubTarget(options.source)
  if (options.source?.type === 'github' && !target) return unavailable('GitHub source requires an immutable commit and valid repository path.')
  if (!target && (!files.length || files.length > 200 || files.some(file => !safeFilePath(file.path)) || new Set(files.map(file => file.path.toLowerCase())).size !== files.length || files.reduce((size, file) => size + Buffer.byteLength(file.content), 0) > 2_000_000)) return unavailable('Stored source files exceed limits or contain unsafe paths.')
  if (activeScans >= 2) return unavailable('Deep scanner is busy; retry after an active scan finishes.')
  activeScans++
  let directory: string | undefined
  try {
    const binaryStat = await stat(binary)
    if (!binaryStat.isFile() || binaryStat.size > 50_000_000) return unavailable('Invalid scanner executable.')
    const digest = createHash('sha256').update(await readFile(binary)).digest('hex')
    if (digest !== env.SKILLSPECTOR_BIN_SHA256!.toLowerCase()) return unavailable('Scanner executable hash does not match the configured pin.')
    directory = await mkdtemp(path.join(tmpdir(), 'skill-shield-deep-'))
    const version = await run(binary, ['--version'], directory, 15_000)
    if (version.trim() !== `SkillSpector v${VERSION}`) return unavailable('Scanner version does not match the pinned engine.')
    const sourceDirectory = path.join(directory, 'source')
    if (!target) {
      await mkdir(sourceDirectory)
      for (const file of files) {
        const filename = path.join(sourceDirectory, file.path)
        await mkdir(path.dirname(filename), { recursive: true })
        await writeFile(filename, file.content, { flag: 'wx' })
      }
    }
    const args = ['scan', target || sourceDirectory, '--format', 'json', '--no-llm']
    if (options.recursive) args.push('--recursive')
    if (options.transitive) {
      args.push('--transitive', '--transitive-depth', String(options.depth || 1))
      for (const prefix of prefixes) args.push('--transitive-allow-prefix', prefix)
    }
    const raw = await run(binary, args, directory, 90_000, true)
    const result = parseDeepReport(raw, files, Boolean(target))
    result.sourceMode = target ? 'immutable-github' : 'stored-text'
    if (!target) { result.status = 'partial'; result.reason = 'Stored text inspected; original binary and archive bytes were not retained and cannot be inspected.' }
    return result
  } catch { return unavailable('SkillSpector failed, timed out, exceeded output limits, or returned an invalid report. No clean verdict is available.') }
  finally { activeScans--; if (directory) await rm(directory, { recursive: true, force: true }).catch(() => undefined) }
}
