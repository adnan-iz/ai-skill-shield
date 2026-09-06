import { afterEach, describe, expect, it, vi } from 'vitest'
import { collectEvidence, fetchExactFile } from '@/lib/review/evidence'
import { findingKey } from '@/lib/review/finding-key'
import type { Finding, ValidationResult } from '@/lib/validator/types'

const fullSha = '2ce448fb4e909a0d6d6dd0dd0d0d0d0d0d0d0d0d'
const finding: Finding = {
  id: 'volatile-finding-id', axis: 'security', severity: 'high', category: 'Security',
  ruleId: 'network-pipe-shell', title: 'Network content piped to shell',
  message: 'The command executes downloaded content.', filePath: 'SKILL.md', lineNumber: 132,
}

function scan(overrides: Partial<ValidationResult['source']> = {}): ValidationResult {
  return {
    id: 'scan-1', timestamp: '', skillName: 'resolve-issue', overallScore: 50, riskLevel: 'high',
    summary: { totalChecks: 1, passed: 0, warnings: 0, failed: 1, criticalCount: 0, highCount: 1, mediumCount: 0, lowCount: 0, infoCount: 0 },
    axes: [], findings: [finding], compatibility: { agents: [], overallCompatibility: 0 },
    tokenAnalysis: { totalTokens: 0, frontmatterTokens: 0, bodyTokens: 0, isUnderLimit: true, limit: 1, breakdown: [] },
    skillPreview: { frontmatter: {}, body: '', fileTree: [] },
    source: { type: 'github', owner: 'acme', repo: 'skill-repo', path: 'skills/resolve-issue', sha: fullSha, ...overrides },
  }
}

function githubContent(content: Buffer | string, size = Buffer.byteLength(content)): Response {
  return Response.json({ type: 'file', encoding: 'base64', size, content: Buffer.from(content).toString('base64') })
}

afterEach(() => vi.restoreAllMocks())

describe('exact-commit evidence', () => {
  it('reads the scan-owned file at the stored full SHA and bounds its context window', async () => {
    const request = vi.fn().mockResolvedValue(githubContent(Array.from({ length: 200 }, (_, index) => `line ${index + 1}`).join('\n')))

    const evidence = await fetchExactFile(scan(), finding, request)

    expect(request).toHaveBeenCalledWith('acme', 'skill-repo', '/repos/acme/skill-repo/contents/skills%2Fresolve-issue%2FSKILL.md?ref=2ce448fb4e909a0d6d6dd0dd0d0d0d0d0d0d0d0d')
    expect(evidence).toMatchObject({ filePath: 'skills/resolve-issue/SKILL.md', startLine: 112, endLine: 152 })
    expect(evidence?.content.length).toBeLessThanOrEqual(16_384)
  })

  it.each([
    ['missing file', new Response(null, { status: 404 })],
    ['binary content', githubContent(Buffer.from([0x61, 0x00, 0x62]))],
    ['malformed base64', Response.json({ encoding: 'base64', size: 3, content: 'not base64!' })],
    ['oversized file', githubContent('small', 256 * 1024 + 1)],
  ])('returns no evidence for %s', async (_label, response) => {
    const request = vi.fn().mockResolvedValue(response)

    await expect(fetchExactFile(scan(), finding, request)).resolves.toBeNull()
  })

  it.each([
    ['missing type', { encoding: 'base64', size: 4, content: 'dGVzdA==' }],
    ['directory type', { type: 'dir', encoding: 'base64', size: 4, content: 'dGVzdA==' }],
    ['missing size', { type: 'file', encoding: 'base64', content: 'dGVzdA==' }],
    ['string size', { type: 'file', encoding: 'base64', size: '4', content: 'dGVzdA==' }],
    ['fractional size', { type: 'file', encoding: 'base64', size: 4.5, content: 'dGVzdA==' }],
    ['negative size', { type: 'file', encoding: 'base64', size: -1, content: 'dGVzdA==' }],
  ])('rejects a Contents payload with %s', async (_label, payload) => {
    const request = vi.fn().mockResolvedValue(Response.json(payload))

    await expect(fetchExactFile(scan(), finding, request)).resolves.toBeNull()
  })

  it('rejects an oversized numeric Content-Length before parsing JSON', async () => {
    const response = Response.json({ type: 'file', encoding: 'base64', size: 4, content: 'dGVzdA==' }, {
      headers: { 'content-length': String(384 * 1024 + 1) },
    })
    const parseJson = vi.spyOn(response, 'json')
    const request = vi.fn().mockResolvedValue(response)

    await expect(fetchExactFile(scan(), finding, request)).resolves.toBeNull()
    expect(parseJson).not.toHaveBeenCalled()
  })

  it('rejects oversized encoded content without decoding it', async () => {
    const parseJson = vi.fn().mockResolvedValue({
      type: 'file',
      encoding: 'base64',
      size: 256 * 1024,
      content: 'A'.repeat(4 * Math.ceil((256 * 1024) / 3) + 4),
    })
    const response = { ok: true, headers: new Headers(), json: parseJson } as unknown as Response
    const decode = vi.spyOn(Buffer, 'from')
    const request = vi.fn().mockResolvedValue(response)

    await expect(fetchExactFile(scan(), finding, request)).resolves.toBeNull()
    expect(parseJson).toHaveBeenCalledOnce()
    expect(decode).not.toHaveBeenCalled()
  })

  it('rejects finding paths that escape the scan-owned skill directory', async () => {
    const request = vi.fn()

    await expect(fetchExactFile(scan(), { ...finding, filePath: '../README.md' }, request)).resolves.toBeNull()
    expect(request).not.toHaveBeenCalled()
  })

  it('does not double-prefix a repository-relative finding path', async () => {
    const request = vi.fn().mockResolvedValue(githubContent('exact source'))

    await fetchExactFile(scan(), { ...finding, filePath: 'skills/resolve-issue/SKILL.md' }, request)

    expect(request).toHaveBeenCalledWith('acme', 'skill-repo', `/repos/acme/skill-repo/contents/skills%2Fresolve-issue%2FSKILL.md?ref=${fullSha}`)
  })

  it('keeps aggregate evidence under the review limit', async () => {
    const largeText = 'x'.repeat(16_384)
    const request = vi.fn().mockImplementation(() => Promise.resolve(githubContent(largeText)))
    const findings = Array.from({ length: 20 }, (_, index) => ({ ...finding, id: `finding-${index}`, filePath: `file-${index}.md`, lineNumber: 1 }))
    const result = { ...scan(), findings }
    const claims = findings.map((item) => ({ findingKey: findingKey(result.id, item), claim: 'Quoted documentation.' }))

    const evidence = await collectEvidence(result, claims, request)

    expect(evidence.reduce((total, item) => total + (item.evidence?.content.length ?? 0), 0)).toBeLessThanOrEqual(128 * 1024)
    expect(request).toHaveBeenCalledTimes(8)
  })
})
