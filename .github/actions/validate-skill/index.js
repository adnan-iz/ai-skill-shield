/* eslint-disable */
const fs = require('fs');
const path = require('path');

async function run() {
  const skillPath = process.env.INPUT_SKILL_PATH || '.';
  const failOn = process.env.INPUT_FAIL_ON || 'high';
  const outputFormat = process.env.INPUT_OUTPUT_FORMAT || 'json';

  const skillDir = path.resolve(process.env.GITHUB_WORKSPACE || '.', skillPath);

  if (!fs.existsSync(skillDir)) {
    console.log(`::error::Skill directory not found: ${skillDir}`);
    process.exit(1);
  }

  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) {
    console.log(`::error::SKILL.md not found in ${skillDir}`);
    process.exit(1);
  }

  const files = [];
  collectFiles(skillDir, skillDir, files);

  if (outputFormat === 'json') {
    console.log(JSON.stringify({ files, skillPath: skillDir }, null, 2));
  }

  console.log(`::notice::Validated ${files.length} files in ${skillPath}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `finding-count=${files.length}\n`);

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const failThreshold = severityOrder[failOn] ?? 1;

  const result = await validateSkill(files, skillDir);

  fs.appendFileSync(process.env.GITHUB_OUTPUT, `score=${result.score}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `risk-level=${result.riskLevel}\n`);

  for (const finding of result.findings) {
    const sev = severityOrder[finding.severity] ?? 4;
    const cmd = sev <= failThreshold ? 'error' : 'warning';
    const filePath = finding.filePath
      ? path.join(skillPath, finding.filePath)
      : path.join(skillPath, 'SKILL.md');
    console.log(`::${cmd} file=${filePath},line=${finding.lineNumber || 1}::${finding.title}: ${finding.message}`);
  }

  if (outputFormat === 'html') {
    const reportPath = path.join(skillDir, 'skillshield-report.html');
    const html = generateHtmlReport(result);
    fs.writeFileSync(reportPath, html);
    console.log(`::notice::Report written to ${reportPath}`);
  }

  if (result.riskLevel === 'critical' || (failOn === 'high' && result.riskLevel === 'high')) {
    console.log(`::error::Skill validation failed: risk level "${result.riskLevel}" exceeds threshold "${failOn}"`);
    process.exit(1);
  }
}

function collectFiles(dir, baseDir, files) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);
    if (entry.isDirectory()) {
      collectFiles(fullPath, baseDir, files);
    } else {
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.push({ path: relativePath.replace(/\\/g, '/'), content });
    }
  }
}

async function validateSkill(files, _skillDir) {
  const content = files.find(f => f.path === 'SKILL.md' || f.path.endsWith('/SKILL.md'))?.content || '';
  const findings = [];

  if (!content) {
    findings.push({
      severity: 'critical',
      category: 'structure',
      title: 'Missing SKILL.md content',
      message: 'No SKILL.md file found or it is empty',
      filePath: 'SKILL.md',
      lineNumber: 1,
      recommendation: 'Create a SKILL.md file with required frontmatter'
    });
  }

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!frontmatterMatch) {
    findings.push({
      severity: 'high',
      category: 'frontmatter',
      title: 'Missing YAML frontmatter',
      message: 'SKILL.md must start with YAML frontmatter between --- markers',
      filePath: 'SKILL.md',
      lineNumber: 1,
      recommendation: 'Add YAML frontmatter with name and description fields'
    });
  } else {
    const fmRaw = frontmatterMatch[1];
    const hasName = /^name\s*:/m.test(fmRaw);
    const hasDesc = /^description\s*:/m.test(fmRaw);

    if (!hasName) {
      findings.push({
        severity: 'high',
        category: 'frontmatter',
        title: 'Missing required field: name',
        message: 'SKILL.md frontmatter must include a "name" field',
        filePath: 'SKILL.md',
        lineNumber: 1,
        recommendation: 'Add "name: your-skill-name" to frontmatter'
      });
    }

    if (!hasDesc) {
      findings.push({
        severity: 'high',
        category: 'frontmatter',
        title: 'Missing required field: description',
        message: 'SKILL.md frontmatter must include a "description" field',
        filePath: 'SKILL.md',
        lineNumber: 1,
        recommendation: 'Add "description: What your skill does" to frontmatter'
      });
    }
  }

  const dangerousPatterns = [
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
            recommendation: 'Remove or secure this pattern'
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

  return { score, riskLevel, findings };
}

function generateHtmlReport(result) {
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
  <title>AI Skill Shield CI Report</title>
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
  <h1>AI Skill Shield CI Validation</h1>
  <div class="score">${result.score}/100</div>
  <div class="meta">Risk Level: ${result.riskLevel.toUpperCase()} &middot; ${result.findings.length} findings</div>
  <h2>Findings</h2>
  ${result.findings.length === 0 ? '<p>No issues found.</p>' : `<table><thead><tr><th>Severity</th><th>Category</th><th>Title</th><th>File:Line</th><th>Recommendation</th></tr></thead><tbody>${findingRows}</tbody></table>`}
  <div class="footer">Generated by AI Skill Shield CI &mdash; Agent Skills Validator</div>
</body>
</html>`;
}

run().catch(err => {
  console.error(`::error::${err.message}`);
  process.exit(1);
});
