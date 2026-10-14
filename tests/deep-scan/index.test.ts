import { describe, expect, it } from 'vitest'
import { parseDeepReport, runDeepScan } from '@/lib/deep-scan'

const files = [{ path: 'SKILL.md', content: 'unsafe\ncommand' }]
describe('optional deep scanner', () => {
  it('marks omitted nested manifests partial even if the engine claims complete', () => {
    const child = { path: 'a', issues: [], execution_successful: true, risk_assessment: { score: 0 }, analysis_completeness: { status: 'complete' } }
    const report = { multi_skill: true, skills: [child], max_risk_score: 0, execution_successful: true, analysis_completeness: { status: 'complete' } }
    const files = [{ path: 'a/SKILL.md', content: '# A' }, { path: 'skills/deep/SKILL.md', content: '# Deep' }]
    expect(parseDeepReport(JSON.stringify(report), files, true).status).toBe('partial')
    expect(parseDeepReport(JSON.stringify({ ...child, path: undefined }), files, true).status).toBe('partial')
  })
  it('maps the pinned engine actual explanation field and recursive reports', () => {
    const issue = { id: 'TT3', explanation: 'Secrets flow to the network', severity: 'CRITICAL', location: { file: 'helper.py', start_line: 1 } }
    const child = { path: 'skills/demo', execution_successful: true, risk_assessment: { score: 74 }, analysis_completeness: { status: 'complete' }, issues: [issue] }
    const report = { multi_skill: true, execution_successful: true, max_risk_score: 74, analysis_completeness: { status: 'complete' }, skills: [child] }
    const result = parseDeepReport(JSON.stringify(report), [], true)
    expect(result.findings[0]).toMatchObject({ severity: 'critical', message: issue.explanation, filePath: 'skills/demo/helper.py' })
    expect(result.riskScore).toBe(74)
    expect(result.status).toBe('complete')
  })
  it('is unavailable unless explicitly configured', async () => {
    expect(await runDeepScan(files, {}, {})).toMatchObject({ status: 'unavailable', findings: [] })
  })
  it('keeps higher-is-worse scores separate and maps issue evidence', () => {
    const result = parseDeepReport(JSON.stringify({ execution_successful: true, risk_assessment: { score: 80 }, analysis_completeness: { status: 'complete' }, issues: [{ id: 'S1', message: 'Unsafe', severity: 'HIGH', location: { file: 'SKILL.md', start_line: 2, end_line: 2 }, evidence: { flow: 'source to sink' } }] }), files)
    expect(result).toMatchObject({ status: 'complete', riskScore: 80, scoreDirection: 'higher-is-worse' })
    expect(result.findings[0]).toMatchObject({ ruleId: 'S1', lineNumber: 2 })
    expect(result.issues[0].evidence).toEqual({ flow: 'source to sink' })
  })
  it('missing completeness and malformed issues cannot produce a clean scan', () => {
    expect(parseDeepReport('{"issues":[]}', files).status).toBe('partial')
    expect(() => parseDeepReport('invalid', files)).toThrow()
    expect(parseDeepReport('{"issues":[{"message":"X"}]}', files).status).toBe('partial')
  })
  it('redacts issue evidence without damaging JSON strings', () => {
    const result = parseDeepReport(JSON.stringify({ issues: [{ id: 'S', message: 'Unsafe', severity: 'HIGH', location: { file: 'SKILL.md', start_line: 1 }, evidence: { secret: `api_key=${'a'.repeat(40)}` } }] }), files)
    expect(result.issues[0].evidence?.secret).toBe('[REDACTED]')
  })
  it('rejects path traversal before launching a configured process', async () => {
    expect(await runDeepScan([{ path: '../escape', content: 'x' }], {}, {})).toMatchObject({ status: 'unavailable' })
  })
})
