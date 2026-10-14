import fs from 'node:fs'
import path from 'node:path'
import { scanLocalSkillWithOptions, applyBaseline, shouldFail, readBaseline } from '../../../../packages/cli/src/local-scan'
import { formatReport } from '../../../../packages/cli/src/command'

const escape = (s: string) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/:/g, '%3A').replace(/,/g, '%2C')
async function run() { try {
  const skillPath = process.env.INPUT_SKILL_PATH || process.env['INPUT_SKILL-PATH'] || '.'
  const dir = path.resolve(process.env.GITHUB_WORKSPACE || '.', skillPath)
  const failOn = process.env.INPUT_FAIL_ON || process.env['INPUT_FAIL-ON'] || 'high'
  const format = process.env.INPUT_OUTPUT_FORMAT || process.env['INPUT_OUTPUT-FORMAT'] || 'json'
  const incomplete = process.env.INPUT_FAIL_ON_INCOMPLETE || process.env['INPUT_FAIL-ON-INCOMPLETE'] || 'true'
  if (!['true', 'false'].includes(incomplete)) throw new Error('fail-on-incomplete must be true or false')
  const dependencies = process.env.INPUT_DEPENDENCIES || 'false'
  if (!['true', 'false'].includes(dependencies)) throw new Error('dependencies must be true or false')
  let result = await scanLocalSkillWithOptions(dir, dependencies === 'true')
  const baseline = process.env.INPUT_BASELINE
  if (baseline) result = applyBaseline(result, readBaseline(dir, path.resolve(process.env.GITHUB_WORKSPACE || '.', baseline)))
  const output = formatReport(result, format)
  if (format === 'html') fs.writeFileSync(path.join(process.env.RUNNER_TEMP || dir, 'skillshield-report.html'), output)
  else console.log(output)
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `score=${result.score}\nrisk-level=${result.riskLevel}\nverdict=${result.verdict}\nfinding-count=${result.findings.length}\nactive-finding-count=${result.activeFindings.length}\ncoverage=${result.coverage.status}\n`)
  for (const f of result.activeFindings) console.log(`::warning file=${escape(path.join(skillPath, f.filePath || 'SKILL.md'))},line=${f.lineNumber || 1}::${escape(f.title + ': ' + f.message)}`)
  if (shouldFail(result, failOn, incomplete === 'true')) { console.error('::error::Security findings or incomplete coverage exceed the configured policy'); process.exitCode = 1 }
} catch (e) { console.error(`::error::${escape(e instanceof Error ? e.message : 'Scan failed')}`); process.exitCode = 1 } }
void run()
