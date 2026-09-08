import { describe, it, expect } from 'vitest'
import { generateSkillBom, bomToPrettyJson } from '@/lib/sbom'
import type { ValidationResult, SkillFile, Finding } from '@/lib/validator/types'

function createMockValidationResult(overrides: Partial<ValidationResult> = {}): ValidationResult {
  return {
    id: 'val-12345',
    timestamp: '2026-09-06T10:00:00.000Z',
    skillName: 'test-agent-skill',
    overallScore: 88,
    riskLevel: 'medium',
    summary: {
      totalChecks: 10,
      passed: 8,
      warnings: 1,
      failed: 1,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 1,
      lowCount: 1,
      infoCount: 0,
    },
    axes: [],
    findings: [
      {
        id: 'finding-001',
        axis: 'security',
        severity: 'critical',
        category: 'injection',
        title: 'Prompt Injection Risk',
        message: 'Potential prompt injection directive detected',
        filePath: 'SKILL.md',
        recommendation: 'Sanitize user inputs before prompting',
        ruleId: 'SEC-001',
      },
      {
        id: 'finding-002',
        axis: 'security',
        severity: 'high',
        category: 'exec',
        title: 'Command Execution Risk',
        message: 'Unbounded shell command invocation detected',
        filePath: 'scripts/run.sh',
        recommendation: 'Use allowlisted commands only',
        ruleId: 'SEC-002',
      },
      {
        id: 'finding-003',
        axis: 'quality',
        severity: 'medium',
        category: 'schema',
        title: 'Unconstrained Parameter',
        message: 'Tool parameter missing schema validation',
        filePath: 'tools.json',
        recommendation: 'Define enum or maxLength constraints',
        ruleId: 'SEC-003',
      },
      {
        id: 'finding-004',
        axis: 'quality',
        severity: 'low',
        category: 'doc',
        title: 'Missing description',
        message: 'Parameter lacks descriptive explanation',
        // filePath omitted intentionally to verify default fallback
        recommendation: 'Add parameter documentation',
        ruleId: 'DOC-001',
      },
    ],
    compatibility: {
      agents: [],
      overallCompatibility: 90,
    },
    tokenAnalysis: {
      totalTokens: 1200,
      frontmatterTokens: 200,
      bodyTokens: 1000,
      isUnderLimit: true,
      limit: 8000,
      breakdown: [],
      cacheEfficiencyScore: 92,
    },
    skillPreview: {
      frontmatter: {
        name: 'test-agent-skill',
        tools: ['web_search'],
      },
      body: '# Test Skill Body',
      fileTree: [],
    },
    ...overrides,
  }
}

describe('SkillBOM Generation (CycloneDX 1.5 for AI Skills)', () => {
  it('generates valid CycloneDX 1.5 specification headers and serial number', () => {
    const result = createMockValidationResult()
    const bom = generateSkillBom(result, [])

    expect(bom.bomFormat).toBe('CycloneDX')
    expect(bom.specVersion).toBe('1.5')
    expect(bom.version).toBe(1)
    expect(bom.serialNumber).toMatch(
      /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    )
  })

  it('populates metadata, tools, and component properties from ValidationResult', () => {
    const result = createMockValidationResult({
      skillName: 'weather-assistant',
      riskLevel: 'high',
      overallScore: 65,
      tokenAnalysis: {
        totalTokens: 500,
        frontmatterTokens: 100,
        bodyTokens: 400,
        isUnderLimit: true,
        limit: 8000,
        breakdown: [],
        cacheEfficiencyScore: 78,
      },
    })

    const bom = generateSkillBom(result, [])

    expect(bom.metadata.timestamp).toBeDefined()
    expect(new Date(bom.metadata.timestamp).toISOString()).toBe(bom.metadata.timestamp)

    expect(bom.metadata.tools).toEqual([
      { vendor: 'SkillShield', name: 'skill-shield', version: '2.0.0' },
    ])

    const comp = bom.metadata.component
    expect(comp).toBeDefined()
    expect(comp?.type).toBe('application')
    expect(comp?.name).toBe('weather-assistant')
    expect(comp?.version).toBe('1.0.0')

    const props = comp?.properties || []
    expect(props).toContainEqual({ name: 'skillshield:riskLevel', value: 'high' })
    expect(props).toContainEqual({ name: 'skillshield:overallScore', value: '65' })
    expect(props).toContainEqual({ name: 'skillshield:cacheEfficiency', value: '78' })
  })

  it('handles missing tokenAnalysis cache efficiency by setting N/A', () => {
    const result = createMockValidationResult({
      tokenAnalysis: undefined as unknown as ValidationResult['tokenAnalysis'],
    })

    const bom = generateSkillBom(result, [])
    const comp = bom.metadata.component
    expect(comp?.properties).toContainEqual({
      name: 'skillshield:cacheEfficiency',
      value: 'N/A',
    })
  })

  it('extracts scanned files as components', () => {
    const result = createMockValidationResult()
    const files: SkillFile[] = [
      { path: 'SKILL.md', content: '---\nname: test\n---\n# Hello' },
      { path: 'scripts/helper.py', content: 'print("hello")' },
    ]

    const bom = generateSkillBom(result, files)
    const fileComponents = bom.components.filter((c) => c.type === 'file')

    expect(fileComponents).toHaveLength(2)
    expect(fileComponents).toContainEqual({ type: 'file', name: 'SKILL.md' })
    expect(fileComponents).toContainEqual({ type: 'file', name: 'scripts/helper.py' })
  })

  it('extracts dependencies from package.json and requirements.txt', () => {
    const result = createMockValidationResult()
    const files: SkillFile[] = [
      {
        path: 'package.json',
        content: JSON.stringify({
          dependencies: {
            lodash: '^4.17.21',
          },
          devDependencies: {
            typescript: '~5.4.0',
          },
        }),
      },
      {
        path: 'requirements.txt',
        content: `
# Core deps
requests==2.31.0
flask>=3.0.0
pytest!=8.0.0
python-dotenv
        `.trim(),
      },
    ]

    const bom = generateSkillBom(result, files)
    const libComponents = bom.components.filter((c) => c.type === 'library')

    // package.json dependencies
    const lodashComp = libComponents.find((c) => c.name === 'lodash')
    expect(lodashComp).toBeDefined()
    expect(lodashComp?.version).toBe('^4.17.21')
    expect(lodashComp?.purl).toBe('pkg:npm/lodash@4.17.21')

    const tsComp = libComponents.find((c) => c.name === 'typescript')
    expect(tsComp).toBeDefined()
    expect(tsComp?.version).toBe('~5.4.0')
    expect(tsComp?.purl).toBe('pkg:npm/typescript@5.4.0')

    // requirements.txt dependencies
    const requestsComp = libComponents.find((c) => c.name === 'requests')
    expect(requestsComp).toBeDefined()
    expect(requestsComp?.version).toBe('2.31.0')
    expect(requestsComp?.purl).toBe('pkg:pypi/requests@2.31.0')

    const flaskComp = libComponents.find((c) => c.name === 'flask')
    expect(flaskComp).toBeDefined()
    expect(flaskComp?.version).toBe('3.0.0')

    const dotenvComp = libComponents.find((c) => c.name === 'python-dotenv')
    expect(dotenvComp).toBeDefined()
    expect(dotenvComp?.purl).toBe('pkg:pypi/python-dotenv')
  })

  it('extracts MCP tools and functions as components', () => {
    const result = createMockValidationResult({
      skillPreview: {
        frontmatter: {
          name: 'tool-skill',
          tools: ['declared_tool_1'],
        },
        body: '',
        fileTree: [],
      },
    })

    const files: SkillFile[] = [
      {
        path: 'mcp.json',
        content: JSON.stringify({
          tools: [
            {
              name: 'fetch_weather',
              description: 'Fetches local weather forecasts',
              inputSchema: { type: 'object', properties: { location: { type: 'string' } } },
            },
          ],
        }),
      },
      {
        path: 'SKILL.md',
        content: `---
name: tool-skill
functions:
  - calculate_metric
---
# Skill Documentation
`,
      },
    ]

    const bom = generateSkillBom(result, files)
    const serviceComponents = bom.components.filter((c) => c.type === 'service')

    const mcpTool = serviceComponents.find((c) => c.name === 'fetch_weather')
    expect(mcpTool).toBeDefined()
    expect(mcpTool?.description).toBe('Fetches local weather forecasts')

    const fmTool = serviceComponents.find((c) => c.name === 'declared_tool_1')
    expect(fmTool).toBeDefined()

    const fmFunction = serviceComponents.find((c) => c.name === 'calculate_metric')
    expect(fmFunction).toBeDefined()
  })

  it('maps findings to CycloneDX vulnerabilities with proper score ratings', () => {
    const result = createMockValidationResult({
      findings: [
        {
          id: 'F-CRIT',
          axis: 'security',
          severity: 'critical',
          category: 'rce',
          title: 'Remote Code Execution',
          message: 'Arbitrary code execution sink detected',
          filePath: 'exec.js',
          recommendation: 'Do not use eval()',
        },
        {
          id: 'F-HIGH',
          axis: 'security',
          severity: 'high',
          category: 'sec',
          title: 'High Severity Issue',
          message: 'Potential secret leak',
          filePath: '.env',
          recommendation: 'Remove secret',
        },
        {
          id: 'F-MED',
          axis: 'security',
          severity: 'medium',
          category: 'sec',
          title: 'Medium Severity Issue',
          message: 'Insecure protocol',
          filePath: 'config.json',
          recommendation: 'Use HTTPS',
        },
        {
          id: 'F-LOW',
          axis: 'security',
          severity: 'low',
          category: 'sec',
          title: 'Low Severity Issue',
          message: 'Verbose logs',
          // No filePath provided
          recommendation: 'Reduce logging level',
        },
      ],
    })

    const bom = generateSkillBom(result, [])
    expect(bom.vulnerabilities).toHaveLength(4)

    const [vCrit, vHigh, vMed, vLow] = bom.vulnerabilities!

    // Critical mapping: score 9.5
    expect(vCrit.id).toBe('F-CRIT')
    expect(vCrit.ratings).toEqual([{ score: 9.5, severity: 'critical' }])
    expect(vCrit.description).toBe('Arbitrary code execution sink detected')
    expect(vCrit.recommendation).toBe('Do not use eval()')
    expect(vCrit.affects).toEqual([{ ref: 'exec.js' }])

    // High mapping: score 7.5
    expect(vHigh.id).toBe('F-HIGH')
    expect(vHigh.ratings).toEqual([{ score: 7.5, severity: 'high' }])
    expect(vHigh.affects).toEqual([{ ref: '.env' }])

    // Medium mapping: score 5.0
    expect(vMed.id).toBe('F-MED')
    expect(vMed.ratings).toEqual([{ score: 5.0, severity: 'medium' }])

    // Low mapping: score 2.5, defaults affects to SKILL.md
    expect(vLow.id).toBe('F-LOW')
    expect(vLow.ratings).toEqual([{ score: 2.5, severity: 'low' }])
    expect(vLow.affects).toEqual([{ ref: 'SKILL.md' }])
  })

  it('falls back to ruleId if finding.id is missing or empty', () => {
    const finding: Finding = {
      id: '',
      axis: 'security',
      severity: 'medium',
      category: 'sec',
      title: 'Rule Only Finding',
      message: 'Detected via rule',
      ruleId: 'RULE-FALLBACK-001',
    }

    const result = createMockValidationResult({
      findings: [finding],
    })

    const bom = generateSkillBom(result, [])
    expect(bom.vulnerabilities![0].id).toBe('RULE-FALLBACK-001')
  })

  it('serializes to pretty formatted JSON correctly via bomToPrettyJson', () => {
    const result = createMockValidationResult()
    const bom = generateSkillBom(result, [{ path: 'SKILL.md', content: 'test' }])

    const jsonString = bomToPrettyJson(bom)
    expect(typeof jsonString).toBe('string')

    // Verify it parses back cleanly
    const parsed = JSON.parse(jsonString)
    expect(parsed.bomFormat).toBe('CycloneDX')
    expect(parsed.specVersion).toBe('1.5')
    expect(parsed.serialNumber).toBe(bom.serialNumber)
    expect(parsed.metadata.component.name).toBe(result.skillName)

    // Verify 2-space indentation
    expect(jsonString).toContain('{\n  "bomFormat": "CycloneDX"')
  })
})
