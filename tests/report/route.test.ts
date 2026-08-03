import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { ValidationResult } from '@/lib/validator/types'

vi.mock('@/lib/store', () => ({
  getResult: vi.fn(),
}))

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({
    allowed: true,
    limit: 30,
    remaining: 29,
    resetAt: Date.now() + 60_000,
  })),
}))

vi.mock('@/lib/security/rate-limit-headers', () => ({
  addRateLimitHeaders: vi.fn((response: Response) => response),
}))

const { getResult } = await import('@/lib/store')
const { GET } = await import('@/app/api/report/route')

function makeResult(): ValidationResult {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    timestamp: '2026-06-03T00:00:00.000Z',
    skillName: 'test-skill',
    overallScore: 88,
    riskLevel: 'low',
    summary: {
      totalChecks: 11,
      passed: 9,
      warnings: 1,
      failed: 1,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 1,
      lowCount: 1,
      infoCount: 0,
    },
    axes: [],
    findings: [],
    compatibility: {
      agents: [],
      overallCompatibility: 0,
    },
    tokenAnalysis: {
      totalTokens: 100,
      frontmatterTokens: 10,
      bodyTokens: 90,
      isUnderLimit: true,
      limit: 5000,
      breakdown: [],
    },
    skillPreview: {
      frontmatter: { name: 'test-skill' },
      body: '# Test',
      fileTree: [],
    },
  }
}

describe('GET /api/report', () => {
  beforeEach(() => {
    vi.mocked(getResult).mockReset()
  })

  it('serves printable HTML for the pdf export path instead of mislabeling HTML as a PDF', async () => {
    vi.mocked(getResult).mockResolvedValue(makeResult())

    const request = new NextRequest('http://localhost:3000/api/report?id=123e4567-e89b-12d3-a456-426614174000&format=pdf')
    const response = await GET(request)
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/html')
    expect(body).toContain('<!DOCTYPE html>')
    expect(body).toContain('AI Skill Shield')
  })

  it('escapes scan-controlled values in HTML exports', async () => {
    const result = makeResult()
    result.skillName = '<img src=x onerror=alert(1)>'
    result.findings = [{
      id: 'finding-1',
      axis: 'security',
      severity: 'high',
      category: '<script>alert(1)</script>',
      title: '<svg onload=alert(1)>',
      message: 'bad',
      filePath: 'SKILL.md',
      lineNumber: 1,
      snippet: '<b>bad</b>',
      recommendation: '<iframe srcdoc=bad></iframe>',
    }]
    result.skillPreview.frontmatter = { description: '<script>alert(1)</script>' }
    vi.mocked(getResult).mockResolvedValue(result)

    const request = new NextRequest('http://localhost:3000/api/report?id=123e4567-e89b-12d3-a456-426614174000&format=html')
    const response = await GET(request)
    const body = await response.text()

    expect(response.status).toBe(200)
    expect(body).not.toContain('<img src=x')
    expect(body).not.toContain('<script>alert(1)</script>')
    expect(body).not.toContain('<svg onload=alert(1)>')
    expect(body).not.toContain('<iframe srcdoc=bad>')
    expect(body).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(body).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
