import { v4 as uuidv4 } from 'uuid'
import type { ValidationResult, SkillFile } from '@/lib/validator/types'
import { extractMcpToolsFromContent } from '@/lib/mcp/schema-scanner'
import { extractFrontmatter } from '@/lib/parser/frontmatter'
import type {
  CycloneDxBom,
  CycloneDxComponent,
  CycloneDxVulnerability,
} from './types'

export * from './types'

function extractDependencies(files: SkillFile[]): CycloneDxComponent[] {
  const components: CycloneDxComponent[] = []
  const seen = new Set<string>()

  for (const file of files) {
    const filename = file.path.replace(/\\/g, '/').split('/').pop() || ''

    if (filename.toLowerCase() === 'package.json') {
      try {
        const pkg = JSON.parse(file.content)
        const sections = [
          pkg.dependencies,
          pkg.devDependencies,
          pkg.peerDependencies,
          pkg.optionalDependencies,
        ]

        for (const section of sections) {
          if (section && typeof section === 'object') {
            for (const [name, rawVersion] of Object.entries(section)) {
              const key = `npm:${name}`
              if (!seen.has(key)) {
                seen.add(key)
                const version = typeof rawVersion === 'string' ? rawVersion : undefined
                const cleanVersion = version ? version.replace(/[\^~>=<]/g, '').trim() : undefined
                const purl = cleanVersion ? `pkg:npm/${name}@${cleanVersion}` : `pkg:npm/${name}`
                components.push({
                  type: 'library',
                  name,
                  ...(version ? { version } : {}),
                  purl,
                })
              }
            }
          }
        }
      } catch {
        // Skip invalid JSON
      }
    } else if (filename.toLowerCase() === 'requirements.txt') {
      const lines = file.content.split(/\r?\n/)
      for (const rawLine of lines) {
        let line = rawLine.trim()
        const commentIdx = line.indexOf('#')
        if (commentIdx !== -1) {
          line = line.slice(0, commentIdx).trim()
        }
        if (!line || line.startsWith('-') || line.startsWith('--')) {
          continue
        }

        const match = line.match(/^([a-zA-Z0-9_\-\.]+)(?:\[.*?\])?\s*(?:(==|>=|<=|~=|!=|<|>)\s*([a-zA-Z0-9_\-\.]+))?/)
        if (match) {
          const name = match[1]
          const version = match[3]
          const key = `pypi:${name.toLowerCase()}`
          if (!seen.has(key)) {
            seen.add(key)
            const purl = version ? `pkg:pypi/${name}@${version}` : `pkg:pypi/${name}`
            components.push({
              type: 'library',
              name,
              ...(version ? { version } : {}),
              purl,
            })
          }
        }
      }
    }
  }

  return components
}

function extractToolsAndFunctions(files: SkillFile[], result?: ValidationResult): CycloneDxComponent[] {
  const components: CycloneDxComponent[] = []
  const seen = new Set<string>()

  // 1. Scan files for MCP tools
  for (const file of files) {
    if (/\.(json|yaml|yml|md|markdown|ts|js|py)$/i.test(file.path)) {
      try {
        const mcpTools = extractMcpToolsFromContent(file.content)
        for (const tool of mcpTools) {
          if (tool.name && !seen.has(tool.name)) {
            seen.add(tool.name)
            components.push({
              type: 'service',
              name: tool.name,
              ...(tool.description ? { description: tool.description } : {}),
            })
          }
        }
      } catch {
        // Skip on parse error
      }
    }
  }

  // 2. Scan frontmatter in skillPreview and markdown/yaml files for declared tools or functions
  const frontmatters: Array<Record<string, unknown>> = []
  if (result?.skillPreview?.frontmatter) {
    frontmatters.push(result.skillPreview.frontmatter)
  }

  for (const file of files) {
    if (/\.(md|markdown|ya?ml)$/i.test(file.path)) {
      const extracted = extractFrontmatter(file.content)
      if (extracted?.data) {
        frontmatters.push(extracted.data)
      }
    }
  }

  for (const fm of frontmatters) {
    const candidateLists = [fm.tools, fm.functions]
    for (const list of candidateLists) {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (typeof item === 'string' && item.trim() && !seen.has(item.trim())) {
            seen.add(item.trim())
            components.push({
              type: 'service',
              name: item.trim(),
            })
          } else if (item && typeof item === 'object') {
            const obj = item as Record<string, unknown>
            if (typeof obj.name === 'string' && obj.name.trim() && !seen.has(obj.name.trim())) {
              seen.add(obj.name.trim())
              components.push({
                type: 'service',
                name: obj.name.trim(),
                ...(typeof obj.description === 'string' ? { description: obj.description } : {}),
              })
            }
          }
        }
      }
    }
  }

  return components
}

export function generateSkillBom(result: ValidationResult, files: SkillFile[] = []): CycloneDxBom {
  const fileComponents: CycloneDxComponent[] = files.map((file) => ({
    type: 'file',
    name: file.path,
  }))

  const dependencyComponents = extractDependencies(files)
  const toolComponents = extractToolsAndFunctions(files, result)

  const components: CycloneDxComponent[] = [
    ...fileComponents,
    ...dependencyComponents,
    ...toolComponents,
  ]

  const vulnerabilities: CycloneDxVulnerability[] = (result.findings || []).map((finding) => {
    const vuln: CycloneDxVulnerability = {
      id: finding.id || finding.ruleId || 'unknown',
      ratings: [
        {
          score:
            finding.severity === 'critical'
              ? 9.5
              : finding.severity === 'high'
                ? 7.5
                : finding.severity === 'medium'
                  ? 5.0
                  : 2.5,
          severity: finding.severity,
        },
      ],
      description: finding.message,
      affects: [{ ref: finding.filePath || 'SKILL.md' }],
    }

    if (finding.recommendation) {
      vuln.recommendation = finding.recommendation
    }

    return vuln
  })

  const cacheEfficiency = result.tokenAnalysis?.cacheEfficiencyScore != null
    ? String(result.tokenAnalysis.cacheEfficiencyScore)
    : 'N/A'

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${uuidv4()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'SkillShield',
          name: 'skill-shield',
          version: '2.0.0',
        },
      ],
      component: {
        type: 'application',
        name: result.skillName,
        version: '1.0.0',
        properties: [
          { name: 'skillshield:riskLevel', value: result.riskLevel },
          { name: 'skillshield:overallScore', value: String(result.overallScore) },
          { name: 'skillshield:cacheEfficiency', value: cacheEfficiency },
        ],
      },
    },
    components,
    vulnerabilities,
  }
}

export function bomToPrettyJson(bom: CycloneDxBom): string {
  return JSON.stringify(bom, null, 2)
}
