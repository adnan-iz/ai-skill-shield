import type { ValidationResult, Finding } from '@/lib/validator/types'
import type { SarifResult, SarifRule, SarifResultItem, SarifInvocation } from './types'
import packageJson from '@/package.json'

const SARIF_SCHEMA = 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Documents/Committed/2-1-0/sarif-v2.1.0.json'

function severityToLevel(severity: string): 'error' | 'warning' | 'note' {
  switch (severity) {
    case 'critical':
    case 'high':
      return 'error'
    case 'medium':
    case 'low':
      return 'warning'
    case 'info':
      return 'note'
    default:
      return 'note'
  }
}

function buildRules(findings: Finding[]): SarifRule[] {
  const seen = new Set<string>()
  const rules: SarifRule[] = []

  for (const f of findings) {
    const id = f.ruleId || f.category
    if (seen.has(id)) continue
    seen.add(id)
    rules.push({
      id,
      name: f.title,
      shortDescription: { text: f.message },
      fullDescription: f.recommendation ? { text: f.recommendation } : undefined,
      properties: { category: f.category, axis: f.axis },
    })
  }

  return rules
}

function buildResults(findings: Finding[]): SarifResultItem[] {
  return findings.map((f) => {
    const result: SarifResultItem = {
      ruleId: f.ruleId || f.category,
      message: { text: f.message },
      level: severityToLevel(f.severity),
      properties: {
        category: f.category,
        axis: f.axis,
        severity: f.severity,
      },
    }

    if (f.recommendation) {
      result.properties!['recommendation'] = f.recommendation
    }

    if (f.filePath) {
      const location: SarifResultItem['locations'] = [
        {
          physicalLocation: {
            artifactLocation: { uri: f.filePath },
          },
        },
      ]
      if (f.lineNumber != null) {
        location[0].physicalLocation.region = {
          startLine: f.lineNumber,
          startColumn: f.column,
        }
      }
      result.locations = location
    }

    return result
  })
}

function buildInvocations(result: ValidationResult): SarifInvocation[] {
  return [
    {
      executionSuccessful: result.riskLevel !== 'critical',
      startTimeUtc: result.timestamp,
      endTimeUtc: new Date().toISOString(),
      properties: {
        overallScore: result.overallScore,
        riskLevel: result.riskLevel,
        totalFindings: result.findings.length,
        totalChecks: result.summary.totalChecks,
        passed: result.summary.passed,
        failed: result.summary.failed,
        warnings: result.summary.warnings,
      },
    },
  ]
}

export function generateSarifReport(result: ValidationResult): SarifResult {
  return {
    $schema: SARIF_SCHEMA,
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'AI Skill Shield',
            version: packageJson.version,
            informationUri: 'https://github.com/anomalyco/skill-shield',
          },
        },
        rules: buildRules(result.findings),
        results: buildResults(result.findings),
        invocations: buildInvocations(result),
      },
    ],
  }
}
