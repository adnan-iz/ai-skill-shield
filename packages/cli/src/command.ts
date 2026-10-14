import fs from 'node:fs'
import { scanLocalSkillWithOptions, createBaseline, applyBaseline, shouldFail, baselinePath, readBaseline, type LocalResult } from './local-scan'
import { outputJson, outputHtml, outputSarif, outputMarkdown } from './formats'
import { runMcp } from './mcp'

export function formatReport(result: LocalResult, format: string): string {
  const formats: Record<string, (result: LocalResult) => string> = { json: outputJson, html: outputHtml, sarif: outputSarif, markdown: outputMarkdown }
  const render = formats[format]
  if (!render) throw new Error('Unknown output format')
  return render(result)
}
export async function runCommand(args: string[]): Promise<void> {
  if (args[0] === 'mcp') { runMcp(); return }
  if (args.includes('--help') || args.length === 0) {
    console.log('skillshield scan <directory> [--format json|html|sarif|markdown] [--output file] [--fail-on critical|high|medium|low|info] [--fail-on-incomplete] [--dependencies] [--baseline file] [--write-baseline file --reason text]\nskillshield mcp')
    return
  }
  if (args[0] === '--version') { console.log('0.3.0'); return }
  if (args[0] !== 'scan' || !args[1] || args[1].startsWith('--')) throw new Error('Expected scan <directory> or mcp')
  const options: Record<string, string> = { format: 'json', 'fail-on': 'high' }
  for (let i = 2; i < args.length; i++) {
    const name = args[i].replace(/^--/, '')
    if (['--fail-on-incomplete', '--dependencies'].includes(args[i])) { options[name] = 'true'; continue }
    if (!args[i].startsWith('--') || !['format', 'fail-on', 'output', 'baseline', 'write-baseline', 'reason'].includes(name) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Invalid option: ${args[i]}`)
    options[name] = args[++i]
  }
  const writeBaseline = options['write-baseline'] ? baselinePath(args[1], options['write-baseline']) : undefined
  const baseline = options.baseline ? readBaseline(args[1], options.baseline) : undefined
  let result = await scanLocalSkillWithOptions(args[1], options.dependencies === 'true')
  if (baseline !== undefined) result = applyBaseline(result, baseline)
  const fail = shouldFail(result, options['fail-on'], options['fail-on-incomplete'] === 'true')
  const output = formatReport(result, options.format)
  if (writeBaseline) fs.writeFileSync(writeBaseline, JSON.stringify(createBaseline(result, options.reason || ''), null, 2))
  if (options.output) fs.writeFileSync(options.output, output)
  else console.log(output)
  if (fail) process.exitCode = 1
}
