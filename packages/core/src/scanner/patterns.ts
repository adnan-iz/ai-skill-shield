import type { Finding, ThreatCategory } from './types'

let findingCounter = 0

function makeFinding(
  severity: Finding['severity'],
  category: string,
  title: string,
  message: string,
  filePath: string,
  lineNumber: number,
  column: number,
  snippet: string,
  recommendation: string,
  patternId?: string,
): Finding {
  return {
    id: `finding-${++findingCounter}`,
    axis: 'security',
    severity,
    category,
    title,
    message,
    filePath,
    lineNumber,
    column,
    snippet,
    recommendation,
    ruleId: patternId,
  }
}

function locate(content: string, pattern: RegExp | string): { index: number; line: number; col: number; snippet: string } | null {
  if (typeof pattern === 'string') {
    const idx = content.indexOf(pattern)
    if (idx === -1) return null
    const before = content.slice(0, idx)
    const line = (before.match(/\n/g) || []).length + 1
    const lastNewline = before.lastIndexOf('\n')
    const col = idx - lastNewline
    const start = Math.max(0, idx - 40)
    const end = Math.min(content.length, idx + pattern.length + 40)
    let snippet = content.slice(start, end)
    if (start > 0) snippet = '...' + snippet
    if (end < content.length) snippet = snippet + '...'
    return { index: idx, line, col, snippet }
  }
  const match = content.match(pattern)
  if (!match || typeof match.index !== 'number') return null
  const idx = match.index
  const before = content.slice(0, idx)
  const line = (before.match(/\n/g) || []).length + 1
  const lastNewline = before.lastIndexOf('\n')
  const col = idx - lastNewline
  const start = Math.max(0, idx - 40)
  const end = Math.min(content.length, idx + (match[0]?.length || 0) + 40)
  let snippet = content.slice(start, end)
  if (start > 0) snippet = '...' + snippet
  if (end < content.length) snippet = snippet + '...'
  return { index: idx, line, col, snippet }
}

const LEADING_COMMENT_RE = /^\s*(\/\/|#|<!--|\/\*|\*)/

function isInComment(content: string, idx: number): boolean {
  const lineStart = content.lastIndexOf('\n', idx - 1) + 1
  const line = content.slice(lineStart, content.indexOf('\n', idx) >= 0 ? content.indexOf('\n', idx) : undefined)
  return LEADING_COMMENT_RE.test(line.trim())
}

interface PatternDef {
  id: string
  category: ThreatCategory
  severity: Finding['severity']
  name: string
  description: string
  detect: (content: string, filePath: string) => Finding | null
}

const patterns: PatternDef[] = [
  // ================================================================
  // COMMAND INJECTION (16 patterns)
  // ================================================================
  {
    id: 'CMD-001',
    category: 'command-injection',
    severity: 'critical',
    name: 'Direct exec() call',
    description: 'Uses Node.js exec() which runs shell commands and is vulnerable to injection',
    detect: (content: string, filePath: string) => {
      const re = /(?:^|[^a-zA-Z_])exec\s*\(\s*[`'"]/
      const loc = locate(content, re)
      if (!loc) return null
      if (isInComment(content, loc.index)) return null
      return makeFinding('critical', 'command-injection', 'Direct exec() call',
        `exec() executes shell commands and is a major RCE vector. Use execFile or spawn with shell:false instead.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Replace exec() with execFile() or use spawn() with shell: false')
    },
  },
  {
    id: 'CMD-002',
    category: 'command-injection',
    severity: 'critical',
    name: 'child_process.exec / spawn shell',
    description: 'Uses child_process module to execute shell commands',
    detect: (content: string, filePath: string) => {
      const re = /require\s*\(\s*['"](?:child_process|node:child_process)['"]\)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'command-injection', 'child_process module usage',
        `child_process module can execute shell commands. Ensure commands are not built from user input.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Validate all command arguments. Prefer execFile over exec. Use shell: false in spawn.')
    },
  },
  {
    id: 'CMD-003',
    category: 'command-injection',
    severity: 'critical',
    name: 'Recursive delete on root directory',
    description: 'Recursive force delete targeting root or critical paths',
    detect: (content: string, filePath: string) => {
      const re = /\brm\s+(?:-[rfRF]+\s*)+[\/\\]/
      const loc = locate(content, re)
      if (!loc) return null
      if (isInComment(content, loc.index)) return null
      return makeFinding('critical', 'command-injection', 'Destructive delete on root',
        `Recursive force delete targeting root directory is extremely destructive.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Never delete from root. Use safer file operations with proper path validation.')
    },
  },
  {
    id: 'CMD-004',
    category: 'command-injection',
    severity: 'high',
    name: 'rimraf on root or dangerous path',
    description: 'Using rimraf npm package on root or system directories',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:rimraf|rm\.rf|del\.sync)\s*\(\s*['"`][\/\\]/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'command-injection', 'rimraf on root',
        `rimraf targeting root or system paths can destroy the filesystem.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Validate target path. Never rimraf absolute root paths.')
    },
  },
  {
    id: 'CMD-005',
    category: 'command-injection',
    severity: 'critical',
    name: 'del /f /s dangerous deletion',
    description: 'Windows force recursive deletion targeting system paths',
    detect: (content: string, filePath: string) => {
      const re = /\bdel\s+\/[fFsSqQ]+\s+(?:[\/\\][A-Za-z]?|%[A-Z].*%|C:\\\\)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'command-injection', 'Windows del /f /s on root',
        `Windows forced recursive deletion can destroy system files.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Target specific files only. Validate the deletion path.')
    },
  },
  {
    id: 'CMD-006',
    category: 'command-injection',
    severity: 'critical',
    name: 'Pipe-to-shell download',
    description: 'Downloads and pipes content directly into shell interpreter',
    detect: (content: string, filePath: string) => {
      const re = /\bcurl\s+.*?(?:\||\|)\s*(?:sh|bash|powershell|pwsh|zsh)\b/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'command-injection', 'Pipe-to-shell download and execute',
        `Piping curl output directly to shell executes untrusted code. This is a major supply chain risk.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Download and verify scripts before execution. Never pipe directly to shell.')
    },
  },
  {
    id: 'CMD-007',
    category: 'command-injection',
    severity: 'critical',
    name: 'wget pipe to shell',
    description: 'Downloads and pipes wget content directly into shell',
    detect: (content: string, filePath: string) => {
      const re = /\bwget\s+.*?(?:\||\|)\s*(?:sh|bash|powershell|pwsh|zsh)\b/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'command-injection', 'wget | sh download and execute',
        `Piping wget output to shell executes untrusted code blindly.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Download and verify scripts manually. Never pipe to shell.')
    },
  },
  {
    id: 'CMD-008',
    category: 'command-injection',
    severity: 'high',
    name: 'Base64-encoded command execution',
    description: 'Decodes and executes base64-encoded shell commands',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:echo|base64)\s+-d\s+['"][A-Za-z0-9+/]{20,}={0,2}['"]\s*\|\s*(?:bash|sh)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'command-injection', 'Base64 decoded command execution',
        `Base64-encoded commands hide malicious intent from casual review.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Avoid decoding and executing base64 content. Review what the encoded payload does.')
    },
  },
  {
    id: 'CMD-009',
    category: 'command-injection',
    severity: 'critical',
    name: 'PowerShell download cradle',
    description: 'PowerShell command that downloads and executes remote scripts',
    detect: (content: string, filePath: string) => {
      const re = /(?:Invoke-WebRequest|iwr|Invoke-RestMethod|irm|Net\.WebClient)\s*.*-UseBasicParsing/i
      const loc = locate(content, re)
      if (!loc) return null
      const fullPattern = /(?:Invoke-WebRequest|iwr|Invoke-RestMethod|irm|Net\.WebClient)\s*.*(?:\||\|)\s*(?:IEX|Invoke-Expression)/i
      const fullLoc = locate(content, fullPattern)
      if (!fullLoc) return null
      return makeFinding('critical', 'command-injection', 'PowerShell download cradle',
        `PowerShell download cradle downloads and executes remote code without verification.`,
        filePath, fullLoc.line, fullLoc.col, fullLoc.snippet,
        'Use Invoke-WebRequest separately from Invoke-Expression. Validate downloaded content.')
    },
  },
  {
    id: 'CMD-010',
    category: 'command-injection',
    severity: 'high',
    name: 'Shell injection via template literals',
    description: 'User input interpolated into shell command strings',
    detect: (content: string, filePath: string) => {
      const re = /exec\s*\(|spawn\s*\(|execSync\s*\(/
      const execLoc = locate(content, re)
      if (!execLoc) return null
      const templateWithVar = /\$\{.*?\}/
      const lineNum = execLoc.line
      const lines = content.split('\n')
      for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 3); i++) {
        if (templateWithVar.test(lines[i])) {
          const col = lines[i].search(templateWithVar) + 1
          return makeFinding('high', 'command-injection', 'Variable interpolation in shell command',
            `Template literals with variables in shell commands allow command injection via user input.`,
            filePath, i + 1, col, lines[i].slice(0, 120),
            'Use execFile or spawn with arguments array to avoid shell injection.')
        }
      }
      return null
    },
  },
  {
    id: 'CMD-011',
    category: 'command-injection',
    severity: 'high',
    name: 'Sudo with password exposure',
    description: 'Passing password to sudo via stdin or arguments',
    detect: (content: string, filePath: string) => {
      const re = /echo\s+['"].*?['"]\s*\|\s*sudo\s+-S/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'command-injection', 'Sudo password in plaintext',
        `Passing sudo password as plaintext exposes credentials in process listings and logs.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Use sudo with proper authentication or password-less sudo for specific commands.')
    },
  },
  {
    id: 'CMD-012',
    category: 'command-injection',
    severity: 'high',
    name: 'chmod 777 permissions',
    description: 'Sets world-writable permissions on files or directories',
    detect: (content: string, filePath: string) => {
      const re = /\bchmod\s+(?:-R\s+)?777\b/
      const loc = locate(content, re)
      if (!loc) return null
      if (isInComment(content, loc.index)) return null
      return makeFinding('high', 'command-injection', 'chmod 777 world-writable permissions',
        `World-writable permissions allow any user to modify the file. Security risk.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Use more restrictive permissions like 755 for directories, 644 for files.')
    },
  },
  {
    id: 'CMD-013',
    category: 'command-injection',
    severity: 'critical',
    name: 'Database drop / delete command',
    description: 'SQL command to drop database or delete all records',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:DROP\s+DATABASE|DROP\s+TABLE|DELETE\s+FROM\s+\S+\s+(?!WHERE)|TRUNCATE\s+TABLE)\b/i
      const loc = locate(content, re)
      if (!loc) return null
      if (isInComment(content, loc.index)) return null
      return makeFinding('critical', 'command-injection', 'Database drop/delete command',
        `Destructive database command that can cause permanent data loss.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Ensure destructive SQL is only executed in controlled migrations with backups.')
    },
  },
  {
    id: 'CMD-014',
    category: 'command-injection',
    severity: 'high',
    name: 'Process execution via child_process',
    description: 'Uses spawn/fork/exec to run system commands',
    detect: (content: string, filePath: string) => {
      const re = /(?:spawn|fork|execFile|execSync)\(/
      const loc = locate(content, re)
      if (!loc) return null
      if (isInComment(content, loc.index)) return null
      const lines = content.split('\n')
      const lineContent = lines[loc.line - 1] || ''
      const hasUserInput = /\$\{.*?\}|\.concat\(|\.join\(|\.replace\(|\.split\(|\+[\s\w'"`]/.test(lineContent)
      if (!hasUserInput) return null
      return makeFinding('high', 'command-injection', 'Process execution with dynamic arguments',
        `Spawn/fork/exec with dynamic arguments risks command injection if arguments contain user input.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Pass arguments as array elements, not as a single string. Validate all inputs.')
    },
  },
  {
    id: 'CMD-015',
    category: 'command-injection',
    severity: 'critical',
    name: 'Disk partition destruction',
    description: 'Commands that wipe, format, or destroy disk partitions',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:dd\s+if=\/dev\/zero|mkfs\.|fdisk\s+\/dev\/[sh]d|format\s+[A-Z]:\s*\/[qfs]|diskpart)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'command-injection', 'Disk destruction command',
        `Command can wipe or reformat disk partitions causing permanent data loss.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Never include disk formatting/destruction commands in agent skills.')
    },
  },
  {
    id: 'CMD-016',
    category: 'command-injection',
    severity: 'medium',
    name: 'Suspicious use of eval on shell commands',
    description: 'Using eval() with command-line tools to execute code',
    detect: (content: string, filePath: string) => {
      const re = /\beval\s*\(\s*['"`].*?(?:exec|spawn|child_process|system|shell|bash|cmd|powershell)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('medium', 'command-injection', 'eval with shell command',
        `eval() combined with shell commands can lead to arbitrary code execution.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Avoid eval(). Use proper API functions instead.')
    },
  },

  // ================================================================
  // DATA EXFILTRATION (12 patterns)
  // ================================================================
  {
    id: 'DAT-001',
    category: 'data-exfiltration',
    severity: 'critical',
    name: 'Curl sending data to external URL',
    description: 'Using curl to POST/PUT data to external servers',
    detect: (content: string, filePath: string) => {
      const re = /\bcurl\s+(?:-[xX]\s+POST|-d|--data|--data-binary|--upload-file|--data-raw)\s+['"]/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'data-exfiltration', 'curl sending data to external',
        `curl with POST/data flags can exfiltrate file contents or environment data to remote servers.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Block outbound data transfer commands unless explicitly required and documented.')
    },
  },
  {
    id: 'DAT-002',
    category: 'data-exfiltration',
    severity: 'critical',
    name: 'Wget sending data to external',
    description: 'Using wget to POST data to external servers',
    detect: (content: string, filePath: string) => {
      const re = /\bwget\s+(?:--post-data|--post-file|--method\s+POST)\b/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'data-exfiltration', 'wget sending data to external',
        `wget with POST flags can exfiltrate data to remote servers.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Block outbound data transfer commands. Use strictly controlled endpoints only.')
    },
  },
  {
    id: 'DAT-003',
    category: 'data-exfiltration',
    severity: 'high',
    name: 'netcat / nc to external host',
    description: 'Using netcat to send data to external IP addresses',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:nc|netcat)\s+.+?(?:-e|-\w*e\b|--exec)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'data-exfiltration', 'netcat with -e flag',
        `netcat with -e flag allows remote command execution and data exfiltration.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Remove netcat from the agent environment. It is rarely needed legitimately.')
    },
  },
  {
    id: 'DAT-004',
    category: 'data-exfiltration',
    severity: 'high',
    name: 'FTP/sFTP upload to external',
    description: 'Uploading files via FTP or SFTP to external servers',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:ftp|sftp|scp)\s+(?:-i\s+|[-a-zA-Z]*\s+)\w+@/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'data-exfiltration', 'FTP/sFTP/SCP upload to external',
        `Uploading files to external hosts via FTP/SFTP/SCP can exfiltrate sensitive data.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Disable outbound FTP/SFTP. Use internal file transfer mechanisms with audit trails.')
    },
  },
  {
    id: 'DAT-005',
    category: 'data-exfiltration',
    severity: 'high',
    name: 'HTTP POST with file contents via fetch',
    description: 'Using fetch/axios to POST file contents to external URLs',
    detect: (content: string, filePath: string) => {
      const re = /(?:fetch|axios|got|superagent|request)\(['"`]https?:\/\//
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 5)
      const endLine = Math.min(lines.length, loc.line + 5)
      const context = lines.slice(startLine, endLine).join('\n')
      const hasFileRead = /(?:readFileSync|readFile|fs\.)/.test(context) || /(?:\.env|\/etc\/|\/home\/|\$HOME|process\.env)/.test(context)
      if (!hasFileRead) return null
      return makeFinding('high', 'data-exfiltration', 'HTTP POST with file contents',
        `Sending file contents to external URLs via HTTP POST can exfiltrate sensitive data.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Do not send file contents to external URLs. Use internal APIs if needed.')
    },
  },
  {
    id: 'DAT-006',
    category: 'data-exfiltration',
    severity: 'high',
    name: 'DNS exfiltration pattern',
    description: 'Using DNS queries to exfiltrate data via subdomains',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:nslookup|dig|host)\s+(?:.*?\.)?\w+\.[a-z]+.*?(?:$(?:cat|\`|file|whoami))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'data-exfiltration', 'DNS exfiltration',
        `DNS lookup tools used with command substitution can exfiltrate data via DNS queries.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Block DNS-based data exfiltration by restricting outbound DNS to known resolvers only.')
    },
  },
  {
    id: 'DAT-007',
    category: 'data-exfiltration',
    severity: 'critical',
    name: 'Sending environment variables to external',
    description: 'Sending process.env or environment variables to external URLs',
    detect: (content: string, filePath: string) => {
      const re = /process\s*\.\s*env/
      const loc = locate(content, re)
      if (!loc) return null
      const urlPattern = /https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}/
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 10)
      const endLine = Math.min(lines.length, loc.line + 10)
      const context = lines.slice(startLine, endLine).join('\n')
      if (!urlPattern.test(context)) return null
      return makeFinding('critical', 'data-exfiltration', 'Environment variables sent to external URL',
        `Sending process.env to external URLs exposes all environment variables including secrets.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Never send environment variables to external services.')
    },
  },
  {
    id: 'DAT-008',
    category: 'data-exfiltration',
    severity: 'high',
    name: 'Copying files to external locations',
    description: 'Copying files to network shares or external hosts',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:cp|copy|Copy-Item|robocopy)\s+.*?\\\\(?:\d{1,3}\.){3}\d{1,3}|[a-zA-Z]:\\Users|\/mnt\/|\/tmp\//
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'data-exfiltration', 'Copying files to external/network location',
        `Copying files to network shares or external mounts can exfiltrate data.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Limit file copy operations to project-local directories only.')
    },
  },
  {
    id: 'DAT-009',
    category: 'data-exfiltration',
    severity: 'high',
    name: 'Using exfiltration-friendly services',
    description: 'Sending data to webhook.site, requestbin, or similar services',
    detect: (content: string, filePath: string) => {
      const re = /(?:webhook\.site|requestbin\.com|hookbin\.com|pipedream\.com|zapier\.com|make\.com|n8n\.cloud)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'data-exfiltration', 'Data sent to exfiltration-friendly service',
        `These services are commonly used for data exfiltration. Data leaves the secure environment.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Block outbound connections to known exfiltration endpoints.')
    },
  },
  {
    id: 'DAT-010',
    category: 'data-exfiltration',
    severity: 'medium',
    name: 'Data conversion prior to exfiltration',
    description: 'Base64 encoding or compressing data before sending externally',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:base64|gzip|zip|tar|bzip2)\s+(?:-d|-c|-f)?/
      const loc = locate(content, re)
      if (!loc) return null
      const urlPattern = /https?:\/\//
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 5)
      const endLine = Math.min(lines.length, loc.line + 10)
      const context = lines.slice(startLine, endLine).join('\n')
      if (!urlPattern.test(context)) return null
      return makeFinding('medium', 'data-exfiltration', 'Data encoded/compressed before external send',
        `Encoding or compressing data before sending externally can hide malicious exfiltration.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Log and audit all cases of encoding before outbound transfers.')
    },
  },
  {
    id: 'DAT-011',
    category: 'data-exfiltration',
    severity: 'critical',
    name: 'Exfiltration via stdin pipe to network',
    description: 'Piping file contents through network tools to external hosts',
    detect: (content: string, filePath: string) => {
      const re = /(?:cat|type|Get-Content)\s+.*?\s*\|\s*(?:curl|wget|nc|netcat)\s+/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'data-exfiltration', 'Piping file contents to network tool',
        `Reading file contents and piping them to network tools exfiltrates data to external hosts.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Block all file-to-network piping operations.')
    },
  },
  {
    id: 'DAT-012',
    category: 'data-exfiltration',
    severity: 'critical',
    name: 'Email exfiltration',
    description: 'Sending files or data via email using command line',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:mail|sendmail|mutt|mailx|blat|send-mailmessage)\s+.*?(?:-a|-attach|--attach|-f|--file)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'data-exfiltration', 'Email-based data exfiltration',
        `Sending files via command-line email tools can exfiltrate sensitive data out of the environment.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Disable command-line email clients in agent environments.')
    },
  },

  // ================================================================
  // CREDENTIAL HARVESTING (12 patterns)
  // ================================================================
  {
    id: 'CRD-001',
    category: 'credential-harvesting',
    severity: 'critical',
    name: 'Accessing SSH private keys',
    description: 'Reading ~/.ssh/id_rsa or similar SSH key files',
    detect: (content: string, filePath: string) => {
      const re = /(?:~\/\.ssh|\/home\/[\w-]+\/\.ssh|\/root\/\.ssh|\$HOME\/\.ssh)/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/readFile|readFileSync|cat\s|Get-Content|type\s/.test(lc)) {
        return makeFinding('critical', 'credential-harvesting', 'SSH private key access',
          `Reading SSH private key files compromises SSH authentication.`,
          filePath, loc.line, loc.col, loc.snippet,
          'Never read SSH keys. Agent should not need direct SSH key access.')
      }
      return null
    },
  },
  {
    id: 'CRD-002',
    category: 'credential-harvesting',
    severity: 'critical',
    name: 'Accessing AWS credentials',
    description: 'Reading ~/.aws/credentials or AWS config files',
    detect: (content: string, filePath: string) => {
      const re = /~\/\.aws\/(?:credentials|config)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'credential-harvesting', 'AWS credential access',
        `Reading AWS credentials files exposes cloud infrastructure access.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Use AWS SDK with IAM roles. Never read credential files directly.')
    },
  },
  {
    id: 'CRD-003',
    category: 'credential-harvesting',
    severity: 'critical',
    name: 'Accessing GCloud credentials',
    description: 'Reading gcloud SDK credential files',
    detect: (content: string, filePath: string) => {
      const re = /~\/\.config\/gcloud\//
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'credential-harvesting', 'GCloud credential access',
        `Reading GCloud SDK credential files exposes Google Cloud access.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Use workload identity or service accounts. Never read gcloud credential files.')
    },
  },
  {
    id: 'CRD-004',
    category: 'credential-harvesting',
    severity: 'high',
    name: 'Reading .env file and outputting externally',
    description: 'Reading .env files and sending contents to external services',
    detect: (content: string, filePath: string) => {
      const re = /(?:readFileSync|readFile|cat\s+|Get-Content\s+|type\s+)\s*\(?\s*['"`]\.env/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 3)
      const endLine = Math.min(lines.length, loc.line + 10)
      const context = lines.slice(startLine, endLine).join('\n')
      const hasExternalSend = /(?:fetch|axios|curl|wget|POST|put)/.test(context)
      if (!hasExternalSend) return null
      return makeFinding('high', 'credential-harvesting', '.env file read and sent externally',
        `Reading .env files and sending to external URLs exposes all environment secrets.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Never send .env file contents to external services.')
    },
  },
  {
    id: 'CRD-005',
    category: 'credential-harvesting',
    severity: 'high',
    name: 'Reading /etc/passwd',
    description: 'Accessing the system password file',
    detect: (content: string, filePath: string) => {
      const re = /\/etc\/passwd/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/readFile|readFileSync|cat\s|Get-Content|type\s/.test(lc)) {
        return makeFinding('high', 'credential-harvesting', '/etc/passwd access',
          `Reading /etc/passwd exposes system user accounts and could assist privilege escalation.`,
          filePath, loc.line, loc.col, loc.snippet,
          'Do not read system user databases. Agent should not need this information.')
      }
      return null
    },
  },
  {
    id: 'CRD-006',
    category: 'credential-harvesting',
    severity: 'critical',
    name: 'Reading /etc/shadow',
    description: 'Accessing the password hash file',
    detect: (content: string, filePath: string) => {
      const re = /\/etc\/shadow/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/readFile|readFileSync|cat\s|Get-Content|type\s/.test(lc)) {
        return makeFinding('critical', 'credential-harvesting', '/etc/shadow access',
          `/etc/shadow contains password hashes that can be cracked offline.`,
          filePath, loc.line, loc.col, loc.snippet,
          'Never read /etc/shadow. It requires root access and is never needed legitimately.')
      }
      return null
    },
  },
  {
    id: 'CRD-007',
    category: 'credential-harvesting',
    severity: 'medium',
    name: 'Accessing npmrc credentials',
    description: 'Reading .npmrc files with auth tokens',
    detect: (content: string, filePath: string) => {
      const re = /(?:~\/\.npmrc|\.npmrc|\/root\/\.npmrc|\$HOME\/\.npmrc|process\.env\.HOME\s*\+\s*['"`]\/\.npmrc)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('medium', 'credential-harvesting', 'npmrc credential access',
        `.npmrc may contain npm registry auth tokens.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Use NPM_TOKEN environment variable instead of reading .npmrc directly.')
    },
  },
  {
    id: 'CRD-008',
    category: 'credential-harvesting',
    severity: 'medium',
    name: 'Accessing pip.conf credentials',
    description: 'Reading pip configuration with credentials',
    detect: (content: string, filePath: string) => {
      const re = /(?:~\/\.pip\/pip\.conf|\/etc\/pip\.conf|pip\.conf)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('medium', 'credential-harvesting', 'pip.conf credential access',
        `pip.conf may contain repository authentication credentials.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Use environment variables for pip repository authentication.')
    },
  },
  {
    id: 'CRD-009',
    category: 'credential-harvesting',
    severity: 'high',
    name: 'Accessing Git credentials',
    description: 'Reading git credential helper stored credentials',
    detect: (content: string, filePath: string) => {
      const re = /(?:git\s+credential|~\/\.git-credentials|\/\.git-credentials)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'credential-harvesting', 'Git credential access',
        `Git credential files store repository access tokens and passwords.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Use SSH keys or credential helpers. Do not read credential files directly.')
    },
  },
  {
    id: 'CRD-010',
    category: 'credential-harvesting',
    severity: 'high',
    name: 'Accessing database connection strings',
    description: 'Reading database config files with connection strings',
    detect: (content: string, filePath: string) => {
      const re = /(?:database\.(?:json|yml|yaml|config)|db\.(?:json|yml|yaml|config)|connection-string|ormconfig\.(?:json|js|ts))/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'credential-harvesting', 'Database config file access',
        `Database configuration files contain connection strings with credentials.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Store database connection strings in environment variables, not config files.')
    },
  },
  {
    id: 'CRD-011',
    category: 'credential-harvesting',
    severity: 'high',
    name: 'Accessing API key config files',
    description: 'Reading API key storage files from various tools',
    detect: (content: string, filePath: string) => {
      const re = /(?:~\/\.netrc|\/root\/\.netrc|_netrc|\.gitconfig|gradle\.properties|~\/\.gradle\/gradle\.properties)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'credential-harvesting', 'API key config file access',
        `Configuration files like .netrc, gradle.properties often contain plaintext API keys.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Use secret management tools or environment variables instead of config files.')
    },
  },
  {
    id: 'CRD-012',
    category: 'credential-harvesting',
    severity: 'medium',
    name: 'Accessing browser credential stores',
    description: 'Reading browser saved passwords or cookies',
    detect: (content: string, filePath: string) => {
      const re = /(?:chromium|chrome|firefox|brave|edge)\s*\/?\s*(?:Login Data|Cookies|Passwords|key[34]\.db|logins\.json)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('medium', 'credential-harvesting', 'Browser credential store access',
        `Reading browser credential stores harvests saved passwords and session data.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Never access browser credential stores. This is a clear sign of credential theft.')
    },
  },

  // ================================================================
  // PROMPT INJECTION (8 patterns)
  // ================================================================
  {
    id: 'PIN-001',
    category: 'prompt-injection',
    severity: 'high',
    name: 'Ignore previous instructions directive',
    description: 'Tries to override system prompts by ignoring prior instructions',
    detect: (content: string, filePath: string) => {
      const re = /ignore\s+(?:all\s+)?(?:previous|prior|above|all)\s+(?:instructions|prompts|directives|commands|rules)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'prompt-injection', 'Ignore previous instructions',
        `Attempts to override system prompt instructions. This is prompt injection.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Sanitize and validate skill instructions for prompt injection patterns.')
    },
  },
  {
    id: 'PIN-002',
    category: 'prompt-injection',
    severity: 'high',
    name: 'Ignore all rules directive',
    description: 'Tries to bypass the entire safety ruleset',
    detect: (content: string, filePath: string) => {
      const re = /ignore\s+(?:all\s+)?(?:your\s+)?rules?\s+(?:and\s+)?(?:follow|do|say|execute|act)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'prompt-injection', 'Ignore all rules',
        `Attempts to disregard all safety rules and restrictions. Classic prompt injection.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Apply input sanitization to reject prompts containing rule override attempts.')
    },
  },
  {
    id: 'PIN-003',
    category: 'prompt-injection',
    severity: 'medium',
    name: 'Role-play bypass attempt',
    description: 'Tries to bypass restrictions by role-playing or personality override',
    detect: (content: string, filePath: string) => {
      const re = /(?:you are (?:now |free |not ).*?(?:no restrictions|no limitations|no boundaries)|act as if|pretend to be|you\'?re now|you have no (?:rules|restrictions|limits))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('medium', 'prompt-injection', 'Role-play bypass attempt',
        `Role-playing prompts attempting to bypass restrictions. May indicate social engineering.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Review and validate prompts that use role-play to circumvent restrictions.')
    },
  },
  {
    id: 'PIN-004',
    category: 'prompt-injection',
    severity: 'high',
    name: 'Direct prompt override attempt',
    description: 'Attempts to override system prompt with direct commands',
    detect: (content: string, filePath: string) => {
      const re = /(?:override\s+(?:your\s+)?(?:prompt|instructions|settings|configuration|safeguards)|new\s+(?:instructions|prompt|directive):|you must (?:now |hereby |from now on ))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'prompt-injection', 'Direct prompt override',
        `Attempts to directly override the system prompt configuration.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Block prompts that attempt to redefine system configuration.')
    },
  },
  {
    id: 'PIN-005',
    category: 'prompt-injection',
    severity: 'critical',
    name: 'System prompt extraction attempt',
    description: 'Tries to extract the system prompt content',
    detect: (content: string, filePath: string) => {
      const re = /(?:print|output|show|reveal|display|leak|leak|dump|repeat|copy|echo|what (?:is|was|were)|tell me)\s+(?:your\s+)?(?:system|initial|first|original)\s+(?:prompt|instruction|message|directive)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('critical', 'prompt-injection', 'System prompt extraction',
        `Attempts to extract the system prompt. This is a prompt injection technique to understand defenses.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Never reveal system prompt content. Implement prompt injection detection.')
    },
  },
  {
    id: 'PIN-006',
    category: 'prompt-injection',
    severity: 'medium',
    name: 'Hypothetical / fictional bypass',
    description: 'Uses hypothetical scenarios to bypass content restrictions',
    detect: (content: string, filePath: string) => {
      const re = /(?:for (?:research|educational|academic)\s+purposes only|purely\s+(?:hypothetical|theoretical)|in a (?:fictional|imaginary|simulated)\s+scenario|imagine\s+(?:if|that|you)|let\'?s\s+pretend|suppose\s+you)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('medium', 'prompt-injection', 'Hypothetical/fictional bypass attempt',
        `Using hypothetical or fictional framing to bypass restrictions.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Treat all prompts with the same security scrutiny regardless of framing.')
    },
  },
  {
    id: 'PIN-007',
    category: 'prompt-injection',
    severity: 'high',
    name: 'DAN / jailbreak pattern',
    description: 'Do Anything Now or jailbreak prompt patterns',
    detect: (content: string, filePath: string) => {
      const re = /\b(?:DAN|do\s+anything\s+now|jail\s*break|jailbreak|unleashed|unleash|freedom\s+mode|developer\s+mode|sudo\s+mode|god\s+mode)\b/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('high', 'prompt-injection', 'DAN/jailbreak pattern',
        `DAN (Do Anything Now) and jailbreak patterns attempt to bypass all safety restrictions.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Block all known jailbreak prompt patterns and variants.')
    },
  },
  {
    id: 'PIN-008',
    category: 'prompt-injection',
    severity: 'medium',
    name: 'Encoding obfuscated prompt injection',
    description: 'Prompt injection attempts hidden via encoding',
    detect: (content: string, filePath: string) => {
      const re = /(?:decode\s+(?:and\s+)?(?:execute|follow|do)|base64.*(?:prompt|instruction|tell|say)|hex.*(?:instruction|command|tell|say))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding('medium', 'prompt-injection', 'Encoded prompt injection',
        `Prompt injection attempts hidden through encoding.`,
        filePath, loc.line, loc.col, loc.snippet,
        'Apply detection recursively to decoded content as well.')
    },
  },

  // ================================================================
  // OBFUSCATION (12 patterns)
  // ================================================================
  {
    id: "OBF-001",
    category: "obfuscation",
    severity: "medium",
    name: "Hex-encoded strings",
    description: "Strings using hex escape sequences to hide content",
    detect: (content: string, filePath: string) => {
      const re = /(?:\\x[0-9a-fA-F]{2}){4,}/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "obfuscation", "Hex-encoded strings detected",
        `Strings using hex escape sequences may be obfuscating malicious content.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Review the decoded content of hex-encoded strings for malicious intent.")
    },
  },
  {
    id: "OBF-002",
    category: "obfuscation",
    severity: "high",
    name: "Base64 encoded commands",
    description: "Base64 encoded content being executed",
    detect: (content: string, filePath: string) => {
      const re = /(?:atob|Buffer\.from|btoa|Base64\.decode|decodeURIComponent|unescape)\s*\(/
      const execRe = /\b(?:eval|Function|setTimeout|setInterval)\s*\(/
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (execRe.test(lines[i]) && (re.test(lines[i]) || content.includes('atob'))) {
          const col = lines[i].search(execRe) + 1
          return makeFinding("high", "obfuscation", "Base64 encoded commands being executed",
            `Base64 decoded content passed to execution functions is a common obfuscation technique.`,
            filePath, i + 1, col, lines[i].slice(0, 120),
            "Avoid executing decoded content. Review the decoded payload.")
        }
      }
      return null
    },
  },
  {
    id: "OBF-003",
    category: "obfuscation",
    severity: "info",
    name: "ROT13/ROT13 encoded content",
    description: "Content using ROT13 or Caesar cipher encoding",
    detect: (content: string, filePath: string) => {
      const re = /\b(?:rot13|rot13|caesar|cipher|tr\s+['\"][A-Za-z]['\"]\s+['\"][N-ZA-Mn-za-m]['\"])/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("info", "obfuscation", "ROT13 encoding detected",
        `ROT13/ROT13 encoded content can hide strings from casual inspection.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Review the plaintext version of ROT13-encoded content.")
    },
  },
  {
    id: "OBF-004",
    category: "obfuscation",
    severity: "medium",
    name: "Reverse string commands",
    description: "Using string reversal to obfuscate commands",
    detect: (content: string, filePath: string) => {
      const re = /(?:\.split\(['\x60"]?\s*['\x60"]?\)\s*\.reverse\(\)\s*\.join\(|\.split\(''\)\.reverse\(\)\.join\(''\)|strrev|rev ")/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "obfuscation", "String reversal obfuscation",
        `Reversing strings and executing them is a common obfuscation technique.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Review what the reversed string decodes to.")
    },
  },
  {
    id: "OBF-005",
    category: "obfuscation",
    severity: "high",
    name: "Multiple encoding layers",
    description: "Content with multiple layers of encoding",
    detect: (content: string, filePath: string) => {
      const layers = [
        (c: string) => (c.match(/(?:\\x[0-9a-fA-F]{2}){4,}/g) || []).length,
        (c: string) => (c.match(/[A-Za-z0-9+/]{50,}={0,2}/g) || []).length,
        (c: string) => (c.match(/e?val\s*\(/g) || []).length > 2 ? 1 : 0,
        (c: string) => (c.match(/unescape|decodeURIComponent|atob/g) || []).length,
      ]
      const score = layers.reduce((s, fn) => s + fn(content), 0)
      if (score < 3) return null
      return makeFinding("high", "obfuscation", "Multiple encoding layers detected",
        `Content has ${score} layers of encoding, which strongly indicates malicious obfuscation.`,
        filePath, 1, 1, content.slice(0, 100),
        "Fully decode all encoding layers and review the resulting plaintext.")
    },
  },
  {
    id: "OBF-006",
    category: "obfuscation",
    severity: "info",
    name: "Hidden Unicode characters",
    description: "Zero-width and invisible Unicode characters detected",
    detect: (content: string, filePath: string) => {
      const zeroWidth = /[\u200B\u200C\u200D\uFEFF\u00AD\u2060\u2061\u2062\u2063\u2064\u180E]/
      const match = content.match(zeroWidth)
      if (!match || typeof match.index !== 'number') return null
      const before = content.slice(0, match.index)
      const line = (before.match(/\n/g) || []).length + 1
      const lastNewline = before.lastIndexOf('\n')
      const col = match.index - lastNewline
      const snippet = content.slice(Math.max(0, match.index - 20), match.index + 20)
      return makeFinding("info", "obfuscation", "Hidden Unicode characters detected",
        `Zero-width or invisible Unicode characters can hide malicious code from reviewers.`,
        filePath, line, col + 1, snippet,
        "Use a hex editor or unicode-aware diff tool to inspect hidden characters.")
    },
  },
  {
    id: "OBF-007",
    category: "obfuscation",
    severity: "info",
    name: "Unicode normalization attack",
    description: "Using visually similar Unicode characters (homoglyphs)",
    detect: (content: string, filePath: string) => {
      const homoglyphs = /[\u0430\u0435\u043E\u0440\u0441\u0445\u0456\u0491\u0432\u043A\u043D\u0442\u0443\u044F\u0405\u0454\u0456\u0458]/u
      const loc = locate(content, homoglyphs)
      if (!loc) return null
      return makeFinding("info", "obfuscation", "Homoglyph characters detected",
        `Visually similar Unicode characters can trick reviewers. Eg Cyrillic 'а' looks like Latin 'a'.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Normalize Unicode to NFC form and verify identifiers contain expected characters.")
    },
  },
  {
    id: "OBF-008",
    category: "obfuscation",
    severity: "medium",
    name: "Escape sequence abuse",
    description: "Using escape sequences to hide strings",
    detect: (content: string, filePath: string) => {
      const re = /(?:\\u00[0-9a-fA-F]{2}|\\u[0-9a-fA-F]{4}){3,}/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "obfuscation", "Escape sequence abuse",
        `Unicode escape sequences used to obfuscate string content.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Decode escape sequences and review the resulting content.")
    },
  },
  {
    id: "OBF-009",
    category: "obfuscation",
    severity: "high",
    name: "eval() with encoded string",
    description: "eval() called with encoded or obscured arguments",
    detect: (content: string, filePath: string) => {
      const re = /\beval\s*\(\s*(?:atob|Buffer|unescape|decodeURIComponent|String\.fromCharCode)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "obfuscation", "eval() with encoded string",
        `eval() called with encoded/decoded arguments is a classic obfuscation technique.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Remove eval() usage entirely. Use proper alternatives.")
    },
  },
  {
    id: "OBF-010",
    category: "obfuscation",
    severity: "medium",
    name: "String.fromCharCode obfuscation",
    description: "Using String.fromCharCode to build strings from character codes",
    detect: (content: string, filePath: string) => {
      const re = /String\.fromCharCode\s*\(/
      const loc = locate(content, re)
      if (!loc) return null
      const execNearby = /(?:eval|Function|setTimeout|setInterval)\s*\(/
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 3)
      const endLine = Math.min(lines.length, loc.line + 3)
      const context = lines.slice(startLine, endLine).join('\n')
      if (!execNearby.test(context)) return null
      return makeFinding("medium", "obfuscation", "String.fromCharCode obfuscation",
        `Building strings from character codes and executing them is an obfuscation technique.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Avoid building strings dynamically from character codes for execution.")
    },
  },
  {
    id: "OBF-011",
    category: "obfuscation",
    severity: "medium",
    name: "Excessive string concatenation",
    description: "Suspicious string splitting and joining to hide intent",
    detect: (content: string, filePath: string) => {
      const re = /['"`][^'"`]{0,3}['"`]\s*\+\s*['"`][^'"`]{0,3}['"`]\s*\+\s*['"`]/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "obfuscation", "Suspicious string concatenation",
        `Strings split into many small pieces then concatenated can hide malicious intent.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Review the combined string to verify it is legitimate.")
    },
  },
  {
    id: "OBF-012",
    category: "obfuscation",
    severity: "high",
    name: "setTimeout/setInterval with encoded string",
    description: "Using setTimeout or setInterval with string arguments for code execution",
    detect: (content: string, filePath: string) => {
      const re = /(?:setTimeout|setInterval)\s*\(\s*['"`]/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "obfuscation", "setTimeout with string argument",
        `setTimeout/setInterval with string arguments is equivalent to eval() and can be obfuscated.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Use function references instead of strings in setTimeout/setInterval.")
    },
  },

  // ================================================================
  // SENSITIVE FILE ACCESS (10 patterns)
  // ================================================================
  {
    id: "SFA-001",
    category: "sensitive-file-access",
    severity: "critical",
    name: "Reading /etc/shadow",
    description: "Accessing the system password hashes file",
    detect: (content: string, filePath: string) => {
      const re = /\/etc\/shadow/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding("critical", "sensitive-file-access", "/etc/shadow access",
          `/etc/shadow contains password hashes. Reading it is a major security violation.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Never read /etc/shadow. This file contains sensitive authentication data.")
      }
      return null
    },
  },
  {
    id: "SFA-002",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading /etc/passwd",
    description: "Accessing the system user database file",
    detect: (content: string, filePath: string) => {
      const re = /\/etc\/passwd/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding("high", "sensitive-file-access", "/etc/passwd access",
          `/etc/passwd lists system users. Can be used for reconnaissance.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Do not read /etc/passwd. It is not needed for legitimate agent operations.")
      }
      return null
    },
  },
  {
    id: "SFA-003",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading .env files",
    description: "Accessing environment variable files",
    detect: (content: string, filePath: string) => {
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const envMatch = lines[i].match(/\.env(?:\b|\.)/)
        if (!envMatch || typeof envMatch.index !== 'number') continue
        if (/(?:readFile|readFileSync|open\s*\(|cat\s+|Get-Content|type\s+)/.test(lines[i])) {
          return makeFinding("high", "sensitive-file-access", ".env file access",
            `.env files contain environment variables, API keys, and secrets.`,
            filePath, i + 1, envMatch.index + 1, lines[i].slice(0, 120),
            "Do not read .env files directly. Access environment variables via process.env.")
        }
      }
      return null
    },
  },
  {
    id: "SFA-004",
    category: "sensitive-file-access",
    severity: "critical",
    name: "Reading SSH private keys",
    description: "Accessing SSH identity files",
    detect: (content: string, filePath: string) => {
      const re = /id_rsa|id_dsa|id_ecdsa|id_ed25519|identity/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc) && /\.ssh/.test(lc)) {
        return makeFinding("critical", "sensitive-file-access", "SSH private key access",
          `SSH private key files grant server access. Their exposure is a critical security incident.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Never read SSH private key files. Use SSH agent or keychain instead.")
      }
      return null
    },
  },
  {
    id: "SFA-005",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading cloud provider configs",
    description: "Accessing AWS/Azure/GCloud configuration files",
    detect: (content: string, filePath: string) => {
      const re = /(?:~\/\.aws|\/root\/\.aws|~\/\.azure|\/root\/\.azure|~\/\.config\/gcloud|\/root\/\.config\/gcloud)/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding("high", "sensitive-file-access", "Cloud provider config access",
          `Cloud provider configuration files contain credentials and access tokens.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Use cloud SDKs with environment-based authentication instead of reading config files.")
      }
      return null
    },
  },
  {
    id: "SFA-006",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading /proc/self/environ",
    description: "Accessing process environment via /proc",
    detect: (content: string, filePath: string) => {
      const re = /\/proc\/self\/environ/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "sensitive-file-access", "/proc/self/environ access",
        `/proc/self/environ exposes all environment variables of the current process.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Access environment variables via process.env instead of reading /proc.")
    },
  },
  {
    id: "SFA-007",
    category: "sensitive-file-access",
    severity: "medium",
    name: "Reading .git/config",
    description: "Accessing git repository configuration",
    detect: (content: string, filePath: string) => {
      const re = /\.git\/(?:config|credentials)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "sensitive-file-access", ".git/config access",
        `.git/config may contain repository URLs with embedded credentials.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Use git commands instead of directly reading .git files.")
    },
  },
  {
    id: "SFA-008",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading HashiCorp Vault secrets",
    description: "Accessing Vault secret files",
    detect: (content: string, filePath: string) => {
      const re = /(?:~\/\.vault|\/root\/\.vault|vault\/secrets|vault-token|\.vault-token)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "sensitive-file-access", "Vault secrets file access",
        `HashiCorp Vault token or secrets files grant access to all stored secrets.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Use Vault API with short-lived tokens instead of reading token files.")
    },
  },
  {
    id: "SFA-009",
    category: "sensitive-file-access",
    severity: "high",
    name: "Reading kubeconfig",
    description: "Accessing Kubernetes configuration files",
    detect: (content: string, filePath: string) => {
      const re = /(?:~\/\.kube|\/root\/\.kube|\.kube\/config|kubeconfig)/i
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding("high", "sensitive-file-access", "kubeconfig access",
          `Kubeconfig files contain cluster access credentials and certificates.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Use kubernetes SDK with service accounts instead of reading kubeconfig files.")
      }
      return null
    },
  },
  {
    id: "SFA-010",
    category: "sensitive-file-access",
    severity: "medium",
    name: "Reading database configuration",
    description: "Accessing database connection configuration files",
    detect: (content: string, filePath: string) => {
      const re = /\/(?:etc\/my\.cnf|etc\/mysql|etc\/postgresql|etc\/mongod\.conf|etc\/redis)/i
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:read|cat|Get-Content|type|open|readFile)/.test(lc)) {
        return makeFinding("medium", "sensitive-file-access", "Database config file access",
          `Database configuration files may contain plaintext passwords and connection details.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Use environment variables for database configuration.")
      }
      return null
    },
  },

  // ================================================================
  // EXTERNAL CALLS (10 patterns)
  // ================================================================
  {
    id: "EXT-001",
    category: "external-calls",
    severity: "medium",
    name: "fetch() to external URL",
    description: "Making HTTP requests to external domains",
    detect: (content: string, filePath: string) => {
      const re = /fetch\s*\(\s*['"`]https?:\/\/(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "external-calls", "fetch() to external URL",
        `Making HTTP requests to external domains can exfiltrate data or introduce dependencies.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Use internal API proxies. Verify external URLs are necessary and safe.")
    },
  },
  {
    id: "EXT-002",
    category: "external-calls",
    severity: "medium",
    name: "axios.get() to external URL",
    description: "Using axios to call external domains",
    detect: (content: string, filePath: string) => {
      const re = /axios\.(?:get|post|put|delete|request)\(\s*['"`]https?:\/\/(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "external-calls", "axios to external URL",
        `axios HTTP requests to external URLs can exfiltrate data.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Route external API calls through a controlled proxy service.")
    },
  },
  {
    id: "EXT-003",
    category: "external-calls",
    severity: "high",
    name: "curl to external host",
    description: "Using curl to connect to external IPs or domains",
    detect: (content: string, filePath: string) => {
      const re = /\bcurl\s+(?:-[a-zA-Z]*\s+)*['"`]?(?:https?:\/\/)?(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|169\.254|10\.|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "external-calls", "curl to external host",
        `curl to external hosts can download/upload arbitrary data.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Whitelist allowed curl targets. Block arbitrary external curl calls.")
    },
  },
  {
    id: "EXT-004",
    category: "external-calls",
    severity: "high",
    name: "wget to external host",
    description: "Using wget to download from external servers",
    detect: (content: string, filePath: string) => {
      const re = /\bwget\s+(?:-[a-zA-Z]*\s+)*['"`]?(?:https?:\/\/)?(?!(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|169\.254|10\.|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "external-calls", "wget to external host",
        `wget downloads files from external hosts. Could be malware download.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Use controlled package managers instead of wget for dependencies.")
    },
  },
  {
    id: "EXT-005",
    category: "external-calls",
    severity: "medium",
    name: "ping to external host",
    description: "Using ping to probe external network hosts",
    detect: (content: string, filePath: string) => {
      const re = /\bping\s+(?:-[a-zA-Z]*\s+)*(?!(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]))(?:\d{1,3}\.){3}\d{1,3}|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "external-calls", "ping to external host",
        `Ping to external hosts can be used for network reconnaissance.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Block ping to external hosts. It is rarely needed legitimately.")
    },
  },
  {
    id: "EXT-006",
    category: "external-calls",
    severity: "medium",
    name: "nslookup/dig to external",
    description: "Using DNS lookup tools on external domains",
    detect: (content: string, filePath: string) => {
      const re = /\b(?:nslookup|dig|host)\s+(?!(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]))[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "external-calls", "nslookup/dig to external domain",
        `DNS lookups to external domains can be used for data exfiltration via DNS.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Restrict DNS resolution to known DNS servers only.")
    },
  },
  {
    id: "EXT-007",
    category: "external-calls",
    severity: "critical",
    name: "Reverse shell establishment",
    description: "Setting up reverse shell connections",
    detect: (content: string, filePath: string) => {
      const re = /(?:bash\s+-i\s*[>&]+\s*\/dev\/tcp\/|python\s+-c\s*['"].*?(?:reverse|socket|pty|spawn)|mkfifo\s+.*?\/dev\/tcp|sh\s+-i\s*[>&]+\s*\/dev\/tcp)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("critical", "external-calls", "Reverse shell establishment",
        `Reverse shell commands give attackers remote access to the system.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Block all reverse shell commands immediately. This is a critical security threat.")
    },
  },
  {
    id: "EXT-008",
    category: "external-calls",
    severity: "high",
    name: "Unknown MCP server connection",
    description: "Connecting to external MCP servers not in allowlist",
    detect: (content: string, filePath: string) => {
      const re = /(?:connect|connect)\s*(?:to\s+)?(?:mcp|model.?context.?protocol)\s*(?:server|endpoint|url)/i
      const loc = locate(content, re)
      if (!loc) return null
      const urlRe = /https?:\/\//
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 3)
      const endLine = Math.min(lines.length, loc.line + 3)
      const context = lines.slice(startLine, endLine).join('\n')
      if (!urlRe.test(context)) return null
      return makeFinding("high", "external-calls", "External MCP server connection",
        `Connecting to MCP servers not in the allowlist can leak context to third parties.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Only connect to MCP servers in the approved allowlist.")
    },
  },
  {
    id: "EXT-009",
    category: "external-calls",
    severity: "high",
    name: "SSH to external host",
    description: "Establishing SSH connections to external servers",
    detect: (content: string, filePath: string) => {
      const re = /\bssh\s+(?:-[a-zA-Z]+\s+)*\w+@(?!(?:127\.0\.0\.1|localhost|0\.0\.0\.0|\[::1\]))/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "external-calls", "SSH to external host",
        `SSH connections to external hosts can tunnel data or execute remote commands.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Block SSH to external hosts. Use bastion hosts with audit trails if needed.")
    },
  },
  {
    id: "EXT-010",
    category: "external-calls",
    severity: "high",
    name: "Connecting to IP address directly",
    description: "Making direct connections to raw IP addresses",
    detect: (content: string, filePath: string) => {
      const re = /(?:https?|tcp|udp):\/\/(?!(?:127\.0\.0\.1|0\.0\.0\.0|10\.|172\.(?:1[6-9]|2[0-9]|3[01])|192\.168|169\.254|\[::1\]|\[fc00|\[fe80))(?:\d{1,3}\.){3}\d{1,3}/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "external-calls", "Direct IP address connection",
        `Connecting to raw external IP addresses bypasses DNS and can hide the destination.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Use domain names instead of raw IPs. Block connections to unknown external IPs.")
    },
  },

  // ================================================================
  // PERSISTENCE (8 patterns)
  // ================================================================
  {
    id: "PER-001",
    category: "persistence",
    severity: "high",
    name: "Adding to crontab",
    description: "Creating cron jobs for persistence",
    detect: (content: string, filePath: string) => {
      const re = /\b(?:crontab|cron\.(?:d|daily|weekly|monthly|hourly)|cron job|@reboot)\b/i
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:echo|printf|cat|>>|>|\|)/.test(lc)) {
        return makeFinding("high", "persistence", "Crontab persistence",
          `Adding entries to crontab can make malicious code run on a schedule or at reboot.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Disable crontab modifications. There is rarely a legitimate reason in agent skills.")
      }
      return null
    },
  },
  {
    id: "PER-002",
    category: "persistence",
    severity: "high",
    name: "Adding to startup files",
    description: "Modifying rc.local or init.d to persist execution",
    detect: (content: string, filePath: string) => {
      const re = /(?:rc\.local|\/etc\/init\.d|\/etc\/rc\d|update-rc\.d|chkconfig|systemctl\s+enable|service\s+--add)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "persistence", "Startup file persistence",
        `Modifying system startup scripts ensures code runs on every boot.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Block modifications to system startup files.")
    },
  },
  {
    id: "PER-003",
    category: "persistence",
    severity: "high",
    name: "Writing to shell profile",
    description: "Modifying ~/.bashrc, ~/.zshrc, /etc/profile for persistence",
    detect: (content: string, filePath: string) => {
      const re = /\/(?:etc\/profile|etc\/bash\.bashrc|etc\/zsh\/zshrc|home\/[\w-]+\/\.(?:bashrc|zshrc|profile|bash_profile))/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:write|readFile|echo|>>|>)/.test(lc)) {
        return makeFinding("high", "persistence", "Shell profile modification",
          `Writing to shell profiles ensures code runs every time a shell is opened.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Do not modify user shell profiles. This persists code across sessions.")
      }
      return null
    },
  },
  {
    id: "PER-004",
    category: "persistence",
    severity: "high",
    name: "Installing systemd service",
    description: "Creating and enabling systemd services for persistence",
    detect: (content: string, filePath: string) => {
      const re = /\/etc\/systemd\/system\/|systemctl\s+(?:enable|daemon-reload|start)|systemd-run/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "persistence", "Systemd service installation",
        `Creating systemd services ensures code runs as a system service on boot.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Block systemd service creation from agent skills.")
    },
  },
  {
    id: "PER-005",
    category: "persistence",
    severity: "high",
    name: "Windows registry auto-start",
    description: "Adding entries to Windows auto-start registry keys",
    detect: (content: string, filePath: string) => {
      const re = /(?:HKCU|HKLM|HKEY_CURRENT_USER|HKEY_LOCAL_MACHINE).*?(?:Run|RunOnce|RunServices)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "persistence", "Windows auto-start registry",
        `Adding to Windows Run registry keys ensures code executes at user login.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Block registry modifications. They are rarely needed in agent skills.")
    },
  },
  {
    id: "PER-006",
    category: "persistence",
    severity: "medium",
    name: "Adding SSH authorized key",
    description: "Adding SSH public key to authorized_keys for persistent access",
    detect: (content: string, filePath: string) => {
      const re = /(?:\/\.ssh\/authorized_keys|\/home\/[\w-]+\/\.ssh\/authorized_keys|\$HOME\/\.ssh\/authorized_keys|ssh-authorized-keys)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "persistence", "SSH authorized key addition",
        `Adding SSH keys to authorized_keys grants persistent SSH access to the system.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Never modify SSH authorized_keys files.")
    },
  },
  {
    id: "PER-007",
    category: "persistence",
    severity: "medium",
    name: "Writing to /etc/hosts or DNS config",
    description: "Modifying hosts file or DNS configuration for persistence",
    detect: (content: string, filePath: string) => {
      const re = /\/etc\/hosts|\/etc\/resolv\.conf/
      const loc = locate(content, re)
      if (!loc) return null
      const lines = content.split('\n')
      const lc = lines[loc.line - 1] || ''
      if (/(?:write|readFile|echo|>>|>)/.test(lc)) {
        return makeFinding("medium", "persistence", "Hosts file modification",
          `Modifying /etc/hosts can redirect traffic and tamper with network resolution.`,
          filePath, loc.line, loc.col, loc.snippet,
          "Never modify system hosts or DNS configuration files.")
      }
      return null
    },
  },
  {
    id: "PER-008",
    category: "persistence",
    severity: "high",
    name: "Launch agent via startup items",
    description: "Creating launch agents or daemons on macOS",
    detect: (content: string, filePath: string) => {
      const re = /(?:~\x2fLibrary\x2fLaunchAgents|\x2fLibrary\x2fLaunchDaemons|launchctl\s+(?:load|submit))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "persistence", "Launch agent/daemon creation",
        `Creating launch agents/daemons ensures code runs on macOS startup.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Block launch agent/daemon creation from agent skills.")
    },
  },

  // ================================================================
  // SOCIAL ENGINEERING (7 patterns)
  // ================================================================
  {
    id: "SOC-001",
    category: "social-engineering",
    severity: "high",
    name: "Instructions to trick the user",
    description: "Directives telling the agent to deceive the user",
    detect: (content: string, filePath: string) => {
      const re = /(?:trick\s+(?:the\s+)?user|deceive\s+(?:the\s+)?user|mislead|fool\s+(?:the\s+)?user|manipulate|cajole|coerce|con\s+(?:the\s+)?user)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "social-engineering", "Trick user directive",
        `Instructions to trick, deceive, or manipulate the user. Classic social engineering.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Flag all instructions involving user deception.")
    },
  },
  {
    id: "SOC-002",
    category: "social-engineering",
    severity: "medium",
    name: "Say this to your admin",
    description: "Instructions telling user to say specific things to an administrator",
    detect: (content: string, filePath: string) => {
      const re = /(?:say\s+(?:this|the following|exactly)\s+to\s+(?:your\s+)?(?:admin|administrator|manager|superior|boss|support)|tell\s+(?:your\s+)?(?:admin|administrator|manager|superior|boss|support)\s+(?:that|this|the following))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "social-engineering", "Say this to admin",
        `Prompting user to say specific phrases to an administrator could be a social engineering vector.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Verify the exact phrasing requested and its purpose.")
    },
  },
  {
    id: "SOC-003",
    category: "social-engineering",
    severity: "high",
    name: "Convincing user to disable security",
    description: "Telling user to disable security software or features",
    detect: (content: string, filePath: string) => {
      const re = /(?:disable\s+(?:your\s+)?(?:antivirus|firewall|security|defender|protection|antimalware)|turn\s+off\s+(?:your\s+)?(?:antivirus|firewall|security|defender)|temporarily\s+(?:disable|deactivate|turn\s+off)\s+(?:your\s+)?(?:security|protection))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "social-engineering", "Disable security request",
        `Asking user to disable security software is a common social engineering tactic.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Never disable security software. This is a manipulation attempt.")
    },
  },
  {
    id: "SOC-004",
    category: "social-engineering",
    severity: "high",
    name: "Asking for credentials from user",
    description: "Requesting user to provide passwords, tokens, or credentials",
    detect: (content: string, filePath: string) => {
      const re = /(?:please\s+(?:provide|enter|give\s+me|share|type)\s+(?:your\s+)?(?:password|credentials|passcode|pin|secret|token|api.?key|login|username)|what(?:['`]s| is)\s+(?:your\s+)?(?:password|credentials|secret|api.?key|token|login))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "social-engineering", "Credential phishing request",
        `Asking user to provide credentials is a phishing/social engineering technique.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Never ask users for their credentials. Use proper authentication mechanisms.")
    },
  },
  {
    id: "SOC-005",
    category: "social-engineering",
    severity: "medium",
    name: "Phishing-like instruction pattern",
    description: "Instructions that mimic common phishing techniques",
    detect: (content: string, filePath: string) => {
      const re = /(?:click\s+(?:this\s+)?(?:link|here)\s+to\s+(?:verify|confirm|validate|reset|update)|urgent\s+(?:action|security|notice|alert|warning)|account\s+(?:suspended|blocked|limited|compromised)|verify\s+(?:your\s+)?(?:identity|account|credentials))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "social-engineering", "Phishing-like pattern",
        `Instructions contain phrasing commonly used in phishing attacks.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Flag URLs requested by the skill and verify them against known phishing databases.")
    },
  },
  {
    id: "SOC-006",
    category: "social-engineering",
    severity: "medium",
    name: "Impersonation directive",
    description: "Instructions to impersonate a trusted person or entity",
    detect: (content: string, filePath: string) => {
      const re = /(?:impersonate|pretend\s+to\s+be|act\s+as\s+(?:if\s+you\s+are|though\s+you\s+are)|masquerade\s+as|pose\s+as)\s+(?!(?:a\s+)?(?:helpful|assistant|chatbot|ai))(?:support|admin|manager|it|tech|security|bank|representative|official)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "social-engineering", "Impersonation directive",
        `Instructions to impersonate trusted entities is a social engineering technique.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Reject instructions that involve impersonating people or organizations.")
    },
  },
  {
    id: "SOC-007",
    category: "social-engineering",
    severity: "high",
    name: "Urgency / fear manipulation",
    description: "Creating false urgency or fear to manipulate user decisions",
    detect: (content: string, filePath: string) => {
      const re = /(?:if\s+you\s+don'?t\s+(?:act|do\s+this|click|respond)\s+(?:now|immediately|right\s+away)|your\s+(?:account|computer|system|data)\s+(?:will\s+be\s+)?(?:hacked|lost|deleted|compromised|locked)|act\s+(?:now|immediately)\s+or|immediate\s+(?:action|attention)\s+required)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "social-engineering", "Urgency/fear manipulation",
        `Creating false urgency or fear is a common social engineering tactic to bypass rational decision-making.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Flag content that uses urgency or fear to pressure user action.")
    },
  },

  // ================================================================
  // CLICKFIX ATTACK (5 patterns)
  // ================================================================
  {
    id: "CFX-001",
    category: "clickfix-attack",
    severity: "high",
    name: "Click Allow on dangerous prompts",
    description: "Instructing user to click Allow on security prompts",
    detect: (content: string, filePath: string) => {
      const re = /(?:click\s+(?:on\s+)?["']?Allow["']?|press\s+["']?Allow["']?|hit\s+["']?Allow["']?|just\s+(?:click|press|hit)\s+allow|click\s+"yes"|click\s+"ok"|click\s+"continue\s+anyway")/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "clickfix-attack", "Click Allow on security prompt",
        `Instructing user to click Allow bypasses security controls. This is a ClickFix attack.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Never blindly click Allow. Verify what permission is being requested.")
    },
  },
  {
    id: "CFX-002",
    category: "clickfix-attack",
    severity: "high",
    name: "Bypassing permission systems",
    description: "Instructions to bypass or circumvent permission prompts",
    detect: (content: string, filePath: string) => {
      const re = /(?:bypass\s+(?:the\s+)?(?:permission|security|safety|confirmation|approval)|dismiss\s+(?:the\s+)?(?:warning|alert|prompt|dialog|confirmation)|run\s+with\s+(?:admin|elevated|sudo)\s+(?:privileges|rights|permissions))/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "clickfix-attack", "Permission system bypass",
        `Instructions to bypass or circumvent permission systems undermine security.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Do not bypass permission systems. Each permission request must be evaluated.")
    },
  },
  {
    id: "CFX-003",
    category: "clickfix-attack",
    severity: "high",
    name: "Auto-confirming dangerous operations",
    description: "Setting operations to auto-confirm without user verification",
    detect: (content: string, filePath: string) => {
      const re = /(?:auto-(?:confirm|approve|accept|allow|grant)|set\s+(?:and\s+)?(?:forget|ignore)|don'?t\s+(?:ask|prompt|bother)\s+(?:again|me|the\s+user)|silently\s+(?:approve|confirm|accept|execute)|yes\s+to\s+all)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "clickfix-attack", "Auto-confirm dangerous operations",
        `Auto-confirming or silencing security prompts removes user protection.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Never auto-confirm security prompts. Always require user consent.")
    },
  },
  {
    id: "CFX-004",
    category: "clickfix-attack",
    severity: "medium",
    name: "Social engineering to approve permissions",
    description: "Convincing user that a permission is harmless when it is not",
    detect: (content: string, filePath: string) => {
      const re = /(?:don'?t\s+worry\s+(?:about|it['`]s\s+)?(?:safe|harmless|ok|fine|normal)|it['`]s\s+(?:just|only)\s+(?:a\s+)?(?:formality|standard|routine|normal)|nothing\s+(?:bad|wrong|dangerous)\s+will\s+happen|trust\s+me|trust\s+the\s+process)\s+(?:and\s+)?(?:click|press|hit|accept|allow|confirm)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("medium", "clickfix-attack", "Social engineering for permission approval",
        `Downplaying risks to convince user to approve permissions is a ClickFix variant.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Evaluate each permission request independently regardless of how it is framed.")
    },
  },
  {
    id: "CFX-005",
    category: "clickfix-attack",
    severity: "high",
    name: "Scripted UI automation bypass",
    description: "Using automation scripts to interact with security dialogs",
    detect: (content: string, filePath: string) => {
      const re = /(?:SendKeys|SendMessage|PostMessage|FindWindow|FindWindowEx|automation\.(?:click|send)|robot\.(?:click|keyPress)|autoit|autohotkey|pyautogui|sikuli|xdotool|ydotool)/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "clickfix-attack", "UI automation for security bypass",
        `UI automation tools used to interact with security dialogs is a ClickFix attack vector.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Block UI automation tools that interact with security prompts.")
    },
  },

  // ================================================================
  // STAGED MALWARE (4 patterns)
  // ================================================================
  {
    id: "SML-001",
    category: "staged-malware",
    severity: "critical",
    name: "Download then execute",
    description: "Downloads a file and then executes it",
    detect: (content: string, filePath: string) => {
      const downloadRe = /\b(?:curl|wget|Invoke-WebRequest|iwr|download|http-get|axios\.get|fetch)\s*\(?/i
      const execRe = /\b(?:exec|spawn|child_process|\.exe|Start-Process|Invoke-Item|\.run|\.start)\s*\(?/i
      const lines = content.split('\n')
      let downloadLine = -1
      for (let i = 0; i < lines.length; i++) {
        if (downloadRe.test(lines[i])) {
          downloadLine = i
          break
        }
      }
      if (downloadLine < 0) return null
      const isChained = /&&|\||;/.test(lines[downloadLine]) && execRe.test(lines[downloadLine])
      for (let i = downloadLine + 1; i < Math.min(lines.length, downloadLine + 10); i++) {
        if (execRe.test(lines[i])) {
          return makeFinding("critical", "staged-malware", "Download then execute pattern",
            `Downloads a file and executes it. This is a staged malware delivery pattern.`,
            filePath, downloadLine + 1, 1, lines.slice(downloadLine, i + 1).join('\n').slice(0, 200),
            "Never download and execute files. Verify and sandbox any downloaded binaries.")
        }
      }
      if (isChained) {
        return makeFinding("critical", "staged-malware", "Download and execute (chained)",
          `Chained download and execute command. Classic staged malware.`,
          filePath, downloadLine + 1, 1, lines[downloadLine].slice(0, 120),
          "Do not chain download commands with execution. Review each step independently.")
      }
      return null
    },
  },
  {
    id: "SML-002",
    category: "staged-malware",
    severity: "critical",
    name: "Multi-stage payload delivery",
    description: "Uses multiple download stages to deliver a payload",
    detect: (content: string, filePath: string) => {
      const downloadCount = (content.match(/\b(?:curl|wget|Invoke-WebRequest|iwr|download|http-get)\b/gi) || []).length
      if (downloadCount < 2) return null
      const execCount = (content.match(/\b(?:exec|spawn|Start-Process|Invoke-Expression|IEX)\b/gi) || []).length
      if (execCount < 1) return null
      return makeFinding("critical", "staged-malware", "Multi-stage payload delivery",
        `Multiple download commands with execution suggests multi-stage malware delivery.`,
        filePath, 1, 1, `Downloads: ${downloadCount}, Executions: ${execCount}`,
        "Each download-execute pair should be individually verified.")
    },
  },
  {
    id: "SML-003",
    category: "staged-malware",
    severity: "high",
    name: "Conditional malicious behavior",
    description: "Code that only executes malicious behavior under specific conditions",
    detect: (content: string, filePath: string) => {
      const dateRe = /\b(?:new\s+Date|Date\.now|getDate|getMonth|getFullYear|getDay|Date\(\))/i
      const envRe = /\b(?:process\.env\.NODE_ENV|process\.env\.(?!NODE_ENV)[A-Z_]{3,})/
      const _targetRe = /\b(?:target|victim|compromise|specific)\b/i
      const loc = locate(content, dateRe) || locate(content, envRe)
      if (!loc) return null
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 5)
      const endLine = Math.min(lines.length, loc.line + 5)
      const context = lines.slice(startLine, endLine).join('\n')
      const hasDangerous = /\b(?:exec|spawn|delete|remove|drop|exfiltrate|steal|malicious|payload)\b/i.test(context)
      if (!hasDangerous) return null
      return makeFinding("high", "staged-malware", "Conditional malicious behavior",
        `Code conditionally executes different behavior based on date or environment. May be time-bomb malware.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Flag code that checks dates or environment variables before executing dangerous operations.")
    },
  },
  {
    id: "SML-004",
    category: "staged-malware",
    severity: "critical",
    name: "Fetching binary payload",
    description: "Downloading executable binary files from external sources",
    detect: (content: string, filePath: string) => {
      const re = /\b(?:curl|wget|Invoke-WebRequest|iwr)\s+.*?\.(?:exe|dll|so|dylib|bin|msi|appimage|deb|rpm|apk)\b/i
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("critical", "staged-malware", "Binary payload download",
        `Downloading executable binaries from external URLs is a malware delivery vector.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Do not download binary executables. Use approved package managers instead.")
    },
  },

  // ================================================================
  // SECOND-ORDER INJECTION (5 patterns)
  // ================================================================
  {
    id: "SOI-001",
    category: "second-order-injection",
    severity: "high",
    name: "Write malicious content to executable file",
    description: "Writes content to a file that will be executed later",
    detect: (content: string, filePath: string) => {
      const writeRe = /(?:writeFile|writeFileSync|appendFile|exec\s*>>?|echo\s+.*?(?:>>|>)|Set-Content|Out-File|Add-Content)/
      const loc = locate(content, writeRe)
      if (!loc) return null
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 2)
      const endLine = Math.min(lines.length, loc.line + 2)
      const context = lines.slice(startLine, endLine).join('\n')
      const scriptExt = /\.[ps]{0,1}(?:bat|cmd|ps1|sh|bash|zsh|py|rb|lua|php|pl)\b/i
      const extMatch = context.match(scriptExt)
      if (!extMatch || typeof extMatch.index !== 'number') return null
      return makeFinding("high", "second-order-injection", "Write executable file",
        `Writing content to a script file that will be executed later. This is second-order injection.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Do not write executable scripts. Evaluate the written content for malicious intent.")
    },
  },
  {
    id: "SOI-002",
    category: "second-order-injection",
    severity: "high",
    name: "Modify config files that auto-execute",
    description: "Modifying configuration files that execute code on load",
    detect: (content: string, filePath: string) => {
      const configFiles = /\/(?:\.bashrc|\.zshrc|\.profile|\.bash_profile|\.npmrc|\.pypirc|\.gemrc|eslintrc|\.prettierrc|tsconfig|package\.json|\.env|init\.d|rc\.local|\.vimrc|\.tmux\.conf|\.gitconfig)/
      const writeRe = /(?:writeFile|writeFileSync|appendFile|>>|>|Set-Content|Out-File)/
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (writeRe.test(lines[i]) && configFiles.test(lines[i])) {
          return makeFinding("high", "second-order-injection", "Modify auto-execute config",
            `Modifying configuration files that auto-execute can inject malicious behavior.`,
            filePath, i + 1, 1, lines[i].slice(0, 120),
            "Do not modify configuration files that execute code. Review changes carefully.")
        }
      }
      return null
    },
  },
  {
    id: "SOI-003",
    category: "second-order-injection",
    severity: "high",
    name: "PATH or LD_PRELOAD pollution",
    description: "Modifying PATH or LD_PRELOAD environment variables",
    detect: (content: string, filePath: string) => {
      const re = /\b(?:export\s+(?:PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH)=|set\s+(?:PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH)=|process\.env\.(?:PATH|LD_PRELOAD|LD_LIBRARY_PATH|PYTHONPATH|NODE_PATH)\s*=)/
      const loc = locate(content, re)
      if (!loc) return null
      return makeFinding("high", "second-order-injection", "PATH/LD_PRELOAD pollution",
        `Modifying PATH or LD_PRELOAD can redirect execution to malicious binaries.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Do not modify PATH or LD_PRELOAD. Use absolute paths for executables.")
    },
  },
  {
    id: "SOI-004",
    category: "second-order-injection",
    severity: "high",
    name: "Write to crontab as second-order",
    description: "Writes content to crontab or cron directories for later execution",
    detect: (content: string, filePath: string) => {
      const writeRe = /(?:echo|printf|cat|writeFile)/
      const cronRe = /(?:crontab|cron\.d|cron\.hourly|cron\.daily|\|\s*crontab)/
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (writeRe.test(lines[i]) && cronRe.test(lines[i])) {
          return makeFinding("high", "second-order-injection", "Write to crontab",
            `Writing to cron schedules creates a delayed execution mechanism. Second-order injection.`,
            filePath, i + 1, 1, lines[i].slice(0, 120),
            "Do not modify cron schedules. They execute with the privileges of the user.")
        }
      }
      return null
    },
  },
  {
    id: "SOI-005",
    category: "second-order-injection",
    severity: "high",
    name: "Write webhook/trigger file",
    description: "Writes content that will be triggered by external events",
    detect: (content: string, filePath: string) => {
      const re = /(?:write|writeFile|appendFile)\s*.*(?:\.js|\.py|\.rb|\.php|\.pl|\.sh|\.bat|\.ps1|\.vbs|\.applescript)\s*['"`]\s*[^'"`]/
      const loc = locate(content, re)
      if (!loc) return null
      const triggerPattern = /\b(?:webhook|trigger|hook|cron|schedule|watch|listen|server|daemon|service|handler)\b/i
      const lines = content.split('\n')
      const startLine = Math.max(0, loc.line - 4)
      const endLine = Math.min(lines.length, loc.line)
      const context = lines.slice(startLine, endLine).join('\n')
      if (!triggerPattern.test(context)) return null
      return makeFinding("high", "second-order-injection", "Writable trigger/webhook file",
        `Writing script files that respond to webhooks or events creates a delayed execution surface.`,
        filePath, loc.line, loc.col, loc.snippet,
        "Review all written script files for malicious content before allowing execution.")
    },
  },
]

export const threatPatterns = patterns

export function detectThreatPatterns(content: string, filePath: string): Finding[] {
  const findings: Finding[] = []
  for (const pattern of patterns) {
    const finding = pattern.detect(content, filePath)
    if (finding) {
      findings.push(finding)
    }
  }
  return findings
}
