import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { immutableGitHubTarget, runDeepScan, SKILLSPECTOR_REVISION } from '@/lib/deep-scan'

vi.mock('node:child_process', () => ({ execFile: vi.fn() }))
vi.mock('node:fs/promises', () => ({ stat: vi.fn(async () => ({ isFile: () => true, size: 3 })), readFile: vi.fn(async () => Buffer.from('bin')), mkdtemp: vi.fn(async () => path.join(process.cwd(), 'tmp-worker')), mkdir: vi.fn(async () => undefined), writeFile: vi.fn(async () => undefined), rm: vi.fn(async () => undefined) }))
const env = { SKILLSPECTOR_BIN: path.join(process.cwd(), 'scanner.exe'), SKILLSPECTOR_COMMIT: SKILLSPECTOR_REVISION, SKILLSPECTOR_BIN_SHA256: createHash('sha256').update('bin').digest('hex') }
const files = [{ path: 'SKILL.md', content: 'safe' }]
const report = JSON.stringify({ execution_successful: true, risk_assessment: { score: 0 }, analysis_completeness: { status: 'complete' }, issues: [] })
function mockProcess(scanOutput = report, fail = false) {
  vi.mocked(execFile).mockImplementation(((...args: unknown[]) => {
    const callback = args[3] as (error: Error | null, stdout: string, stderr: string) => void
    const argv = args[1] as string[]
    callback(fail && argv[0] === 'scan' ? new Error('timeout') : null, argv[0] === '--version' ? 'SkillSpector v2.12.0' : scanOutput, '')
    return {} as ReturnType<typeof execFile>
  }) as typeof execFile)
}
describe('deep subprocess boundary', () => {
  beforeEach(() => { vi.clearAllMocks(); mockProcess() })
  it('uses no shell, bounded output and cleanup; text input has partial coverage', async () => {
    expect(await runDeepScan(files, {}, env)).toMatchObject({ status: 'partial', sourceMode: 'stored-text' })
    expect(execFile).toHaveBeenLastCalledWith(env.SKILLSPECTOR_BIN, expect.arrayContaining(['scan', '--no-llm']), expect.objectContaining({ shell: false, timeout: 90_000, maxBuffer: 2_000_000 }), expect.any(Function))
    expect(rm).toHaveBeenCalledWith(expect.stringContaining('tmp-worker'), { recursive: true, force: true })
  })
  it('fails closed on malformed output and subprocess errors with cleanup', async () => {
    mockProcess('bad json')
    expect((await runDeepScan(files, {}, env)).status).toBe('unavailable')
    expect(rm).toHaveBeenCalled()
    mockProcess(report, true)
    expect((await runDeepScan(files, {}, env)).status).toBe('unavailable')
  })
  it('preserves risk findings when the engine exits 1 for a completed risk verdict', async () => {
    vi.mocked(execFile).mockImplementation(((...args: unknown[]) => {
      const callback = args[3] as (error: Error | null, stdout: string, stderr: string) => void
      const version = (args[1] as string[])[0] === '--version'
      callback(version ? null : Object.assign(new Error('risk threshold exceeded'), { code: 1, killed: false, signal: null }), version ? 'SkillSpector v2.12.0' : report.replace('"score":0', '"score":80'), '')
      return {} as ReturnType<typeof execFile>
    }) as typeof execFile)
    expect(await runDeepScan(files, {}, env)).toMatchObject({ status: 'partial', riskScore: 80 })
  })
  it('rejects unpinned binaries, unsafe paths and unapproved traversal without launching', async () => {
    expect((await runDeepScan(files, {}, { ...env, SKILLSPECTOR_BIN_SHA256: '0'.repeat(64) })).status).toBe('unavailable')
    expect((await runDeepScan([{ path: '../escape', content: 'x' }], {}, env)).status).toBe('unavailable')
    expect((await runDeepScan(files, { transitive: true }, env)).status).toBe('unavailable')
    expect(execFile).not.toHaveBeenCalled()
  })
  it('acquires original immutable GitHub content and permits only configured prefixes', async () => {
    const source = { type: 'github' as const, owner: 'owner', repo: 'repo', sha: 'a'.repeat(40), path: 'skills/example' }
    expect(await runDeepScan(files, { source, transitive: true, depth: 2 }, { ...env, SKILLSPECTOR_TRANSITIVE_PREFIXES: 'https://github.com/owner/repo/' })).toMatchObject({ status: 'complete', sourceMode: 'immutable-github' })
    expect(execFile).toHaveBeenLastCalledWith(env.SKILLSPECTOR_BIN, expect.arrayContaining([immutableGitHubTarget(source), '--transitive', '--transitive-depth', '2', '--transitive-allow-prefix', 'https://github.com/owner/repo/']), expect.any(Object), expect.any(Function))
    expect(writeFile).not.toHaveBeenCalled()
    expect(immutableGitHubTarget({ ...source, path: '../secret' })).toBeUndefined()
    expect(immutableGitHubTarget({ ...source, sha: 'main' })).toBeUndefined()
  })
})
