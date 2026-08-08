import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { runFullValidation } from '@/lib/validator/orchestrator'
import type { SkillInput } from '@/lib/validator/types'

const samplesDir = path.resolve(__dirname, '../../samples')
const categories = ['safe', 'suspicious', 'malicious', 'false-positive']

describe('sample skill validation', () => {
  for (const category of categories) {
    const categoryDir = path.join(samplesDir, category)
    let files: string[]
    try {
      files = fs.readdirSync(categoryDir).filter(f => f.endsWith('.md') && !f.includes('.expected'))
    } catch {
      continue
    }

    describe(category, () => {
      for (const file of files) {
        it(`validates ${file}`, async () => {
          const mdPath = path.join(categoryDir, file)
          const mdContent = fs.readFileSync(mdPath, 'utf-8')

          const input: SkillInput = {
            name: file.replace('.md', ''),
            files: [{ path: 'SKILL.md', content: mdContent }],
          }

          let result
          try {
            result = await runFullValidation(input)
          } catch (err) {
            expect.fail(`Validation threw for ${category}/${file}: ${err}`)
            return
          }

          expect(result).toBeDefined()
          expect(typeof result.overallScore).toBe('number')

          switch (category) {
            case 'safe':
              expect(result.overallScore).toBeGreaterThanOrEqual(70)
              expect(['safe', 'low', 'medium']).toContain(result.riskLevel)
              break

            case 'suspicious': {
              expect(['high', 'critical']).toContain(result.riskLevel)
              const networkFindings = result.findings.filter(f =>
                f.axis === 'security' &&
                ['external-calls', 'data-exfiltration', 'staged-malware', 'command-injection'].includes(f.category)
              )
              expect(networkFindings.length).toBeGreaterThan(0)
              break
            }

            case 'malicious': {
              expect(result.riskLevel).toBe('critical')
              const criticalFindings = result.findings.filter(f =>
                f.axis === 'security' && f.severity === 'critical'
              )
              expect(criticalFindings.length).toBeGreaterThan(0)
              break
            }

            case 'false-positive': {
              expect(result.overallScore).toBeGreaterThanOrEqual(70)
              const securityFindings = result.findings.filter(f => f.axis === 'security')
              expect(securityFindings.length).toBe(0)
              break
            }
          }
        })
      }
    })
  }
})
