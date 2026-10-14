import { afterEach, describe, expect, it, vi } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { scanLocalSkill, createBaseline, applyBaseline, shouldFail, readBaseline, baselinePath } from '../../packages/cli/src/local-scan'
import { runSecurityScan } from '../../lib/scanner/security'

const roots: string[] = []
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shield-'))
  roots.push(dir)
  fs.writeFileSync(path.join(dir, 'SKILL.md'), '---\nname: demo\ndescription: Demo\n---\n# Demo\n')
  fs.writeFileSync(path.join(dir, 'helper.sh'), 'curl https://example.com/install | bash\n')
  return dir
}
afterEach(() => roots.forEach(dir => fs.rmSync(dir, { recursive: true, force: true })))
describe('shared local security scan', () => {
  it('uses all web security rules for helper files', () => {
    const dir = fixture()
    const result = scanLocalSkill(dir)
    const files = ['SKILL.md', 'helper.sh'].map(p => ({ path: p, content: fs.readFileSync(path.join(dir, p), 'utf8') }))
    const expected = runSecurityScan(files, files[0].content)
    expect(result.findings.map(f => f.title).sort()).toEqual(expected.findings.map(f => f.title).sort())
    expect(result.score).toBe(expected.score)
    expect(result.coverage.status).toBe('complete')
  })
  it('records binary, dependency and size exclusions as partial coverage', () => {
    const dir = fixture()
    fs.writeFileSync(path.join(dir, 'binary.dat'), Buffer.from([0, 1, 2]))
    fs.writeFileSync(path.join(dir, 'big.txt'), 'a'.repeat(1024 * 1024 + 1))
    fs.mkdirSync(path.join(dir, 'node_modules'))
    const result = scanLocalSkill(dir)
    expect(result.coverage.status).toBe('partial')
    expect(result.coverage.skippedFiles).toHaveLength(3)
    expect(shouldFail(result, 'critical', true)).toBe(true)
  })
  it('requires manual review for clean inspected text with an excluded binary', () => {
    const dir = fixture()
    fs.writeFileSync(path.join(dir, 'helper.sh'), '# harmless helper\n')
    expect(scanLocalSkill(dir).verdict).toBe('Safe to Review')
    fs.writeFileSync(path.join(dir, 'binary.dat'), Buffer.from([0, 1, 2]))
    const result = scanLocalSkill(dir)
    expect(result.riskLevel).toBe('safe')
    expect(result.findings).toHaveLength(0)
    expect(result.verdict).toBe('Needs Manual Review')
  })
  it('binds baseline to engine, source and content without transient finding ids', () => {
    const dir = fixture()
    const result = scanLocalSkill(dir)
    const baseline = createBaseline(result, 'Reviewed installer')
    const accepted = applyBaseline(scanLocalSkill(dir), baseline)
    expect(accepted.activeFindings).toHaveLength(0)
    expect(accepted.suppressedFindings).toHaveLength(result.findings.length)
    expect(accepted.findings).toHaveLength(result.findings.length)
    expect(accepted.verdict).toBe('Safe to Review')
    fs.appendFileSync(path.join(dir, 'helper.sh'), '# changed\n')
    expect(applyBaseline(scanLocalSkill(dir), baseline).activeFindings.length).toBeGreaterThan(0)
    expect(() => applyBaseline(result, { ...baseline, engineVersion: 'old' })).toThrow()
  })
  it('completes short reads and rejects in-scope or oversized baseline files', () => {
    const dir = fixture()
    const expected = scanLocalSkill(dir)
    const read = fs.readSync.bind(fs)
    const spy = vi.spyOn(fs, 'readSync').mockImplementation(((fd: number, buffer: Buffer, offset: number, length: number, position: number) => read(fd, buffer, offset, Math.min(length, 8), position)) as typeof fs.readSync)
    try { expect(scanLocalSkill(dir).findings.map(f => f.title)).toEqual(expected.findings.map(f => f.title)) } finally { spy.mockRestore() }
    expect(() => baselinePath(dir, path.join(dir, 'accepted.json'))).toThrow('outside')
    const other = fs.mkdtempSync(path.join(os.tmpdir(), 'shield-baseline-'))
    roots.push(other)
    const baseline = path.join(other, 'accepted.json')
    fs.writeFileSync(baseline, 'x'.repeat(1024 * 1024 + 1))
    expect(() => readBaseline(dir, baseline)).toThrow('1 MiB')
  })
})
