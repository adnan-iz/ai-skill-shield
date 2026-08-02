#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';

interface Finding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  message: string;
  filePath: string;
  lineNumber: number;
  recommendation: string;
}

interface ScanResult {
  score: number;
  riskLevel: string;
  findings: Finding[];
  name: string;
  description: string;
}

const dangerousPatterns: { pattern: RegExp; severity: Finding['severity']; title: string; category: string }[] = [
  { pattern: /rm\s+-(?:rf|fr)\s+\//, severity: 'critical', title: 'Dangerous rm -rf /', category: 'command-injection' },
  { pattern: /curl\s+.*\|\s*(?:sh|bash)/, severity: 'critical', title: 'curl pipe to shell', category: 'command-injection' },
  { pattern: /(?:sk-[a-zA-Z0-9]{20,})/, severity: 'critical', title: 'OpenAI API key hardcoded', category: 'secrets' },
  { pattern: /(?:ghp_|gho_|ghu_|ghs_|ghr_)[a-zA-Z0-9]{36}/, severity: 'critical', title: 'GitHub token hardcoded', category: 'secrets' },
  { pattern: /(?:-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----)/, severity: 'critical', title: 'Private key hardcoded', category: 'secrets' },
  { pattern: /exec\s*\(/, severity: 'high', title: 'exec() call detected', category: 'command-injection' },
  { pattern: /child_process/, severity: 'high', title: 'child_process module usage', category: 'command-injection' },
  { pattern: /eval\s*\(/, severity: 'high', title: 'eval() call detected', category: 'code-execution' },
  { pattern: /\.env/, severity: 'medium', title: '.env file access', category: 'sensitive-file-access' },
  { pattern: /localhost/, severity: 'low', title: 'localhost reference', category: 'network' },
];

function collectFiles(dir: string, baseDir: string): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, baseDir));
    } else {
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.push({ path: relativePath.replace(/\\/g, '/'), content });
    }
  }
  return files;
}

async function scanSkill(skillDir: string): Promise<ScanResult> {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    return { score: 0, riskLevel: 'critical', findings: [], name: '', description: '' };
  }

  const content = fs.readFileSync(skillMdPath, 'utf-8');
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  let name = '';
  let description = '';
  if (frontmatterMatch) {
    const fmRaw = frontmatterMatch[1];
    const nameMatch = fmRaw.match(/^name\s*:\s*(.+)$/m);
    const descMatch = fmRaw.match(/^description\s*:\s*(.+)$/m);
    name = nameMatch ? nameMatch[1].trim() : '';
    description = descMatch ? descMatch[1].trim() : '';
  }

  const files = collectFiles(skillDir, skillDir);
  const findings: Finding[] = [];

  if (!content) {
    findings.push({
      severity: 'critical',
      category: 'structure',
      title: 'Missing SKILL.md content',
      message: 'No SKILL.md file found or it is empty',
      filePath: 'SKILL.md',
      lineNumber: 1,
      recommendation: 'Create a SKILL.md file with required frontmatter',
    });
  }

  if (!frontmatterMatch) {
    findings.push({
      severity: 'high',
      category: 'frontmatter',
      title: 'Missing YAML frontmatter',
      message: 'SKILL.md must start with YAML frontmatter between --- markers',
      filePath: 'SKILL.md',
      lineNumber: 1,
      recommendation: 'Add YAML frontmatter with name and description fields',
    });
  } else {
    if (!/^name\s*:/m.test(frontmatterMatch[1])) {
      findings.push({
        severity: 'high', category: 'frontmatter', title: 'Missing required field: name',
        message: 'SKILL.md frontmatter must include a "name" field', filePath: 'SKILL.md',
        lineNumber: 1, recommendation: 'Add "name: your-skill-name" to frontmatter',
      });
    }
    if (!/^description\s*:/m.test(frontmatterMatch[1])) {
      findings.push({
        severity: 'high', category: 'frontmatter', title: 'Missing required field: description',
        message: 'SKILL.md frontmatter must include a "description" field', filePath: 'SKILL.md',
        lineNumber: 1, recommendation: 'Add "description: What your skill does" to frontmatter',
      });
    }
  }

  for (const file of files) {
    for (const dp of dangerousPatterns) {
      const match = file.content.match(dp.pattern);
      if (match) {
        const before = file.content.slice(0, Math.max(0, match.index || 0));
        const lineNumber = (before.match(/\n/g) || []).length + 1;
        if (!findings.some(f => f.title === dp.title && f.filePath === file.path)) {
          findings.push({
            severity: dp.severity,
            category: dp.category,
            title: dp.title,
            message: `Pattern found in ${file.path}`,
            filePath: file.path,
            lineNumber,
            recommendation: 'Remove or secure this pattern',
          });
        }
      }
    }
  }

  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const highCount = findings.filter(f => f.severity === 'high').length;
  const mediumCount = findings.filter(f => f.severity === 'medium').length;
  const lowCount = findings.filter(f => f.severity === 'low').length;

  let score = 100;
  score -= criticalCount * 50;
  score -= highCount * 25;
  score -= mediumCount * 10;
  score -= lowCount * 5;
  score = Math.max(0, Math.min(100, score));

  let riskLevel = 'safe';
  if (criticalCount > 0) riskLevel = 'critical';
  else if (highCount > 0) riskLevel = 'high';
  else if (mediumCount > 0) riskLevel = 'medium';
  else if (lowCount > 0) riskLevel = 'low';

  return { score, riskLevel, findings, name, description };
}

function outputJson(result: ScanResult): string {
  return JSON.stringify(result, null, 2);
}

function outputHtml(result: ScanResult): string {
  const findingRows = result.findings.map(f => `
    <tr>
      <td><span class="sev sev-${f.severity}">${f.severity.toUpperCase()}</span></td>
      <td>${f.category}</td>
      <td>${f.title}</td>
      <td>${f.filePath}:${f.lineNumber || '-'}</td>
      <td>${f.recommendation || '-'}</td>
    </tr>`).join('');

  const scoreColor = result.score >= 70 ? '#16a34a' : result.score >= 50 ? '#ca8a04' : result.score >= 30 ? '#ea580c' : '#dc2626';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SkillShield CLI Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 960px; margin: 0 auto; padding: 2rem; color: #18181b; background: #fff; }
    h1 { font-size: 1.5rem; }
    .score { font-size: 3rem; font-weight: 700; color: ${scoreColor}; }
    .meta { color: #71717a; font-size: 0.875rem; margin: 0.5rem 0 2rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.5rem 0.75rem; border-bottom: 1px solid #e4e4e7; font-size: 0.875rem; }
    th { font-weight: 600; color: #71717a; background: #fafafa; }
    .sev { font-weight: 600; font-size: 0.75rem; padding: 0.125rem 0.5rem; border-radius: 999px; }
    .sev-critical { background: #fef2f2; color: #dc2626; }
    .sev-high { background: #fff7ed; color: #ea580c; }
    .sev-medium { background: #fefce8; color: #ca8a04; }
    .sev-low { background: #f7fee7; color: #65a30d; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e4e4e7; font-size: 0.75rem; color: #a1a1aa; }
  </style>
</head>
<body>
  <h1>SkillShield CLI Report</h1>
  <div class="score">${result.score}/100</div>
  <div class="meta">Risk Level: ${result.riskLevel.toUpperCase()} &middot; ${result.findings.length} findings</div>
  <h2>Findings</h2>
  ${result.findings.length === 0 ? '<p>No issues found.</p>' : `<table><thead><tr><th>Severity</th><th>Category</th><th>Title</th><th>File:Line</th><th>Recommendation</th></tr></thead><tbody>${findingRows}</tbody></table>`}
  <div class="footer">Generated by SkillShield CLI</div>
</body>
</html>`;
}

function outputSarif(result: ScanResult): string {
  const runs = [{
    tool: { driver: { name: 'SkillShield', informationUri: 'https://github.com/skill-shield', rules: [] } },
    results: result.findings.map(f => ({
      ruleId: f.title,
      level: f.severity === 'critical' || f.severity === 'high' ? 'error' : f.severity === 'medium' ? 'warning' : 'note',
      message: { text: `${f.title}: ${f.message}` },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: f.filePath },
          region: { startLine: f.lineNumber },
        },
      }],
    })),
    properties: { score: result.score, riskLevel: result.riskLevel },
  }];
  return JSON.stringify({ $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json', version: '2.1.0', runs }, null, 2);
}

function outputMarkdown(result: ScanResult): string {
  let md = `# SkillShield Scan Report\n\n`;
  md += `**Score:** ${result.score}/100\n`;
  md += `**Risk Level:** ${result.riskLevel.toUpperCase()}\n`;
  md += `**Findings:** ${result.findings.length}\n\n`;
  if (result.findings.length === 0) {
    md += `No issues found.\n`;
  } else {
    md += `| Severity | Category | Title | File |\n| --- | --- | --- | --- |\n`;
    for (const f of result.findings) {
      md += `| ${f.severity.toUpperCase()} | ${f.category} | ${f.title} | ${f.filePath}:${f.lineNumber} |\n`;
    }
  }
  return md;
}

const program = new Command();

program
  .name('skillshield')
  .description('Scan AI agent skills for security risks')
  .version('0.2.0');

program
  .command('scan')
  .description('Scan a skill directory for security issues')
  .argument('<path>', 'path to skill directory')
  .option('--format <format>', 'output format: json, html, sarif, markdown', 'json')
  .option('--fail-on <severity>', 'exit with code 1 if risk level exceeds this threshold: critical, high, medium, low', 'high')
  .option('--output <file>', 'write output to file instead of stdout')
  .option('--policy <path>', 'path to policy file')
  .action(async (skillPath: string, options: { format: string; failOn: string; output?: string; policy?: string }) => {
    const resolvedPath = path.resolve(skillPath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(chalk.red(`Error: Directory not found: ${resolvedPath}`));
      process.exit(1);
    }

    const result = await scanSkill(resolvedPath);

    let output: string;
    switch (options.format) {
      case 'html':
        output = outputHtml(result);
        break;
      case 'sarif':
        output = outputSarif(result);
        break;
      case 'markdown':
        output = outputMarkdown(result);
        break;
      default:
        output = outputJson(result);
    }

    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.log(chalk.green(`Report written to ${options.output}`));
    } else {
      console.log(output);
    }

    const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    const threshold = severityOrder[options.failOn] ?? 1;
    const resultLevel = severityOrder[result.riskLevel] ?? 4;

    if (resultLevel <= threshold) {
      console.error(chalk.red(`Skill validation failed: risk level "${result.riskLevel}" exceeds threshold "${options.failOn}"`));
      process.exit(1);
    }
  });

program.parse();
