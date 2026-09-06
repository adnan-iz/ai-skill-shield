export interface CommandAnalysisResult {
  command: string
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe'
  score: number // 0-100 (100 is safest)
  summary: string
  risks: CommandRiskItem[]
  extractedEntities: {
    urls: string[]
    packages: string[]
    flags: string[]
    elevatedPrivileges: boolean
  }
  recommendations: string[]
}

export interface CommandRiskItem {
  severity: 'critical' | 'high' | 'medium' | 'low'
  type: string
  title: string
  description: string
  snippet?: string
}

// Known dangerous flags across various package managers and CLIs
const DANGEROUS_FLAGS: Array<{
  pattern: RegExp
  flagName: string
  title: string
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}> = [
  {
    pattern: /(?:^|\s)(--ignore-scripts)(?:[\s=]|$)/i,
    flagName: '--ignore-scripts',
    title: 'Lifecycle Script Bypass (--ignore-scripts)',
    description: 'Disables standard lifecycle script execution. Often used to suppress postinstall warnings or run malicious packages out-of-band.',
    severity: 'high',
  },
  {
    pattern: /(?:^|\s)(--dangerously-skip-permissions)(?:[\s=]|$)/i,
    flagName: '--dangerously-skip-permissions',
    title: 'Permission Check Bypass (--dangerously-skip-permissions)',
    description: 'Explicitly disables security permission prompts, allowing the tool or skill to execute with unrestricted host capabilities.',
    severity: 'high',
  },
  {
    pattern: /(?:^|\s)(--(?:force|force-reinstall)|-f)(?:[\s=]|$)/i,
    flagName: '--force',
    title: 'Forced Installation (--force / -f)',
    description: 'Forces installation, overriding safety conflicts, integrity warnings, or existing file protections.',
    severity: 'high',
  },
  {
    pattern: /(?:^|\s)(--no-verify)(?:[\s=]|$)/i,
    flagName: '--no-verify',
    title: 'Verification Bypass (--no-verify)',
    description: 'Bypasses verification checks, signature validation, or integrity checks during installation.',
    severity: 'high',
  },
  {
    pattern: /(?:^|\s)(--(?:allow-run|allow-all))(?:[\s=]|$)/i,
    flagName: '--allow-run',
    title: 'Permissive Execution Flag (--allow-run / --allow-all)',
    description: 'Grants broad execution permissions to the runtime without interactive confirmation.',
    severity: 'high',
  },
  {
    pattern: /(?:^|\s)(--(?:no-check-certificate|insecure))(?:[\s=]|$)/i,
    flagName: '--insecure',
    title: 'TLS Certificate Verification Disabled',
    description: 'Disables SSL/TLS certificate verification, allowing unencrypted or man-in-the-middle compromised downloads.',
    severity: 'high',
  },
  {
    pattern: /(?:^|\s)(--trusted-host(?:=|\s+)[^\s]+)/i,
    flagName: '--trusted-host',
    title: 'Untrusted Host Whitelisting (--trusted-host)',
    description: 'Bypasses HTTPS requirements for specified package index hosts.',
    severity: 'high',
  },
]

// Shell tokenization respecting single and double quotes
function tokenizeCommand(cmd: string): string[] {
  const tokens: string[] = []
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(cmd)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(match[1])
    } else if (match[2] !== undefined) {
      tokens.push(match[2])
    } else {
      tokens.push(match[0])
    }
  }
  return tokens
}

// Flags that consume the following argument as their value
const FLAGS_WITH_ARGUMENT = new Set([
  '-r', '--requirement',
  '-i', '--index-url',
  '--extra-index-url',
  '-t', '--target',
  '-c', '--config',
  '-o', '--output',
  '--prefix',
  '--registry',
  '--dist-tag',
  '-b', '--branch',
  '-m', '--message',
  '--filter',
])

function extractUrls(cmd: string): string[] {
  const urlRegex = /https?:\/\/[^\s"'`<>|;&()]+/gi
  const matches = cmd.match(urlRegex) || []
  return Array.from(new Set(matches.map((u) => u.replace(/[.,;!?)]+$/, ''))))
}

function extractFlags(cmd: string): string[] {
  const flagRegex = /(?:^|\s)(--?[a-zA-Z0-9][a-zA-Z0-9_-]*(?:=[^\s"']*)?)/g
  const flags: string[] = []
  let match: RegExpExecArray | null
  while ((match = flagRegex.exec(cmd)) !== null) {
    const flag = match[1].trim()
    if (flag !== '-' && flag !== '--') {
      flags.push(flag)
    }
  }
  return Array.from(new Set(flags))
}

function extractPackages(cmd: string): string[] {
  const packages: string[] = []
  // Split by pipeline or command chain delimiters
  const segments = cmd.split(/\||&&|\|\||;/).map((s) => s.trim()).filter(Boolean)

  for (const segment of segments) {
    const tokens = tokenizeCommand(segment)
    if (tokens.length === 0) continue

    // Strip environment variable assignments (e.g. VAR=val)
    while (tokens.length > 0 && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[0])) {
      tokens.shift()
    }

    // Strip elevated execution prefix
    if (tokens.length > 0 && /^(?:sudo|doas|runas|gsudo)$/i.test(tokens[0])) {
      tokens.shift()
    }

    if (tokens.length === 0) continue

    const cmdName = tokens[0].toLowerCase()

    let pkgStartIndex = -1
    let isSinglePkgCommand = false

    if (cmdName === 'codex' || cmdName === 'claw') {
      if (tokens.length >= 3 && tokens[1].toLowerCase() === 'skill' && /^(?:install|add)$/i.test(tokens[2])) {
        pkgStartIndex = 3
      }
    } else if (['npm', 'pnpm', 'bun'].includes(cmdName)) {
      if (tokens.length >= 2 && /^(?:install|i|add)$/i.test(tokens[1])) {
        pkgStartIndex = 2
      }
    } else if (cmdName === 'yarn') {
      if (tokens.length >= 2 && tokens[1].toLowerCase() === 'add') {
        pkgStartIndex = 2
      }
    } else if (['pip', 'pip3', 'pipx'].includes(cmdName)) {
      if (tokens.length >= 2 && /^(?:install|add|run)$/i.test(tokens[1])) {
        pkgStartIndex = 2
      }
    } else if (cmdName === 'poetry') {
      if (tokens.length >= 2 && tokens[1].toLowerCase() === 'add') {
        pkgStartIndex = 2
      }
    } else if (['cargo', 'gem', 'brew', 'choco', 'winget'].includes(cmdName)) {
      if (tokens.length >= 2 && /^(?:install|add)$/i.test(tokens[1])) {
        pkgStartIndex = 2
      }
    } else if (cmdName === 'apt' || cmdName === 'apt-get') {
      if (tokens.length >= 2 && tokens[1].toLowerCase() === 'install') {
        pkgStartIndex = 2
      }
    } else if (cmdName === 'npx') {
      pkgStartIndex = 1
      isSinglePkgCommand = true
    }

    if (pkgStartIndex !== -1) {
      let i = pkgStartIndex
      while (i < tokens.length) {
        const token = tokens[i]
        if (token.startsWith('-')) {
          if (FLAGS_WITH_ARGUMENT.has(token.toLowerCase()) && i + 1 < tokens.length) {
            i += 2 // skip flag and its argument value
            continue
          }
          i++
          continue
        }

        // Avoid shell operators or redirects
        if (['>', '<', '>>', '&', '2>', '1>'].includes(token)) {
          break
        }

        packages.push(token)
        if (isSinglePkgCommand) {
          break
        }
        i++
      }
    }
  }

  return Array.from(new Set(packages))
}

export function analyzeInstallCommand(command: string): CommandAnalysisResult {
  const trimmed = (command || '').trim()

  const urls = extractUrls(trimmed)
  const flags = extractFlags(trimmed)
  const packages = extractPackages(trimmed)
  const elevatedPrivileges = /\b(?:sudo|doas|runas|gsudo)\b/i.test(trimmed)

  const risks: CommandRiskItem[] = []

  if (!trimmed) {
    return {
      command,
      riskLevel: 'safe',
      score: 100,
      summary: 'No command provided to analyze.',
      risks: [],
      extractedEntities: {
        urls: [],
        packages: [],
        flags: [],
        elevatedPrivileges: false,
      },
      recommendations: [],
    }
  }

  // 1. Pipe-to-shell patterns (Critical)
  const pipeToShellRegex =
    /(?:curl|wget|fetch|http|iwr|irm|invoke-webrequest|invoke-restmethod)\b[^|;&\n]*\|\s*(?:sudo\s+)?(?:bash|sh|zsh|dash|ksh|python[23]?|perl|ruby|node|powershell(?:\.exe)?|pwsh|cmd(?:\.exe)?|iex|invoke-expression)\b/i
  const subshellExecRegex =
    /(?:bash|sh|zsh|dash|eval|source|\.)\s*(?:<\s*\(\s*(?:curl|wget|fetch|iwr)|(?:\$\(|\`)\s*(?:curl|wget|fetch|iwr))/i

  const pipeMatch = trimmed.match(pipeToShellRegex) || trimmed.match(subshellExecRegex)
  if (pipeMatch) {
    risks.push({
      severity: 'critical',
      type: 'pipe_to_shell',
      title: 'Direct Pipe-to-Shell Remote Execution',
      description:
        'Remote scripts downloaded via curl/wget are piped directly into a shell or interpreter without integrity checking or code review.',
      snippet: pipeMatch[0],
    })
  }

  // 2. Suspicious inline executions (High)
  const inlineExecRegex =
    /\b(?:python[23]?\s+-c|node\s+(?:-e|--eval)|bash\s+-c|sh\s+-c|perl\s+-e|ruby\s+-e|powershell(?:\.exe)?\s+(?:-[cC](?:ommand)?|-[eE](?:ncoded[cC]ommand)?)|cmd(?:\.exe)?\s+\/[cC])\s+["']?[^"'\n;]{2,}/i
  const inlineMatch = trimmed.match(inlineExecRegex)
  if (inlineMatch) {
    risks.push({
      severity: 'high',
      type: 'inline_execution',
      title: 'Suspicious Inline Code Execution',
      description:
        'Command executes arbitrary inline script strings (-c, -e) which bypass static package verification and can execute harmful code.',
      snippet: inlineMatch[0],
    })
  }

  // 3. Obfuscation and Dynamic Evaluation (Critical / High)
  const base64DecodeRegex =
    /\b(?:base64\s+(?:-d|--decode)|atob\s*\(|\[System\.Convert\]::FromBase64String|base64\.b64decode)\b/i
  const hexDecodeRegex =
    /\b(?:xxd\s+(?:-r|-p)|bytes\.fromhex)\b|(?:\\x[0-9a-fA-F]{2}){4,}/i
  const evalRegex =
    /\b(?:eval\s*\(|eval\s+["'$]|Invoke-Expression\b|\biex\b)/i
  const longBase64Regex = /[A-Za-z0-9+/]{80,}={0,2}/

  const base64Match = trimmed.match(base64DecodeRegex)
  const hexMatch = trimmed.match(hexDecodeRegex)
  const evalMatch = trimmed.match(evalRegex)
  const longB64Match = trimmed.match(longBase64Regex)

  if (evalMatch) {
    risks.push({
      severity: 'critical',
      type: 'obfuscation',
      title: 'Dynamic Code Evaluation (eval/iex)',
      description:
        'Uses dynamic evaluation routines (eval or Invoke-Expression) to execute generated or hidden code.',
      snippet: evalMatch[0],
    })
  } else if (base64Match) {
    const isPipedToExec = /\|\s*(?:bash|sh|python|node|powershell|cmd)/i.test(trimmed)
    risks.push({
      severity: isPipedToExec ? 'critical' : 'high',
      type: 'obfuscation',
      title: 'Base64 Decoded Payload Execution',
      description:
        'Decodes base64-encoded strings during command execution, a common technique to conceal malicious payloads.',
      snippet: base64Match[0],
    })
  } else if (hexMatch) {
    risks.push({
      severity: 'high',
      type: 'obfuscation',
      title: 'Hex Encoded Payload or Decoder',
      description:
        'Uses hex escape sequences or decoding tools (xxd -r) to obfuscate command instructions.',
      snippet: hexMatch[0],
    })
  } else if (longB64Match) {
    risks.push({
      severity: 'high',
      type: 'obfuscation',
      title: 'High-Entropy Obfuscated String',
      description:
        'Contains long base64-encoded payloads that obscure the underlying instructions.',
      snippet: longB64Match[0].slice(0, 40) + '...',
    })
  }

  // 4. Elevated Privileges (High)
  if (elevatedPrivileges) {
    const sudoMatch = trimmed.match(/\b(?:sudo|doas|runas|gsudo)\b/i)
    risks.push({
      severity: 'high',
      type: 'elevated_privileges',
      title: 'Elevated Privilege Execution',
      description:
        'Executes with administrative or root privileges (sudo/doas/runas), granting unconstrained host system access to install scripts.',
      snippet: sudoMatch ? sudoMatch[0] : 'sudo',
    })
  }

  // 5. Dangerous package flags (High)
  for (const dangerousFlag of DANGEROUS_FLAGS) {
    const flagMatch = trimmed.match(dangerousFlag.pattern)
    if (flagMatch) {
      risks.push({
        severity: dangerousFlag.severity,
        type: 'dangerous_flag',
        title: dangerousFlag.title,
        description: dangerousFlag.description,
        snippet: flagMatch[1] || flagMatch[0].trim(),
      })
    }
  }

  // 6. Insecure download protocols (Medium)
  const insecureUrls = urls.filter(
    (u) => /^http:\/\//i.test(u) && !/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/i.test(u)
  )
  if (insecureUrls.length > 0) {
    risks.push({
      severity: 'medium',
      type: 'insecure_protocol',
      title: 'Insecure HTTP Download Protocol',
      description:
        'Downloads packages or scripts over unencrypted HTTP (http://), exposing the process to Man-In-The-Middle (MITM) tampering.',
      snippet: insecureUrls.join(', '),
    })
  }

  // 7. Chained download-then-execute (High)
  const chainedExecRegex = /(?:curl|wget)\b[^|;&\n]+&&\s*(?:sudo\s+)?(?:bash|sh|zsh|python[23]?|node)\b/i
  const chainedMatch = trimmed.match(chainedExecRegex)
  if (chainedMatch && !pipeMatch) {
    risks.push({
      severity: 'high',
      type: 'chained_download_execution',
      title: 'Chained Download and Execution',
      description:
        'External script is downloaded to the local file system and immediately executed in sequence.',
      snippet: chainedMatch[0],
    })
  }

  // 8. Raw network sockets or reverse shell patterns (Critical)
  const reverseShellRegex =
    /(?:\/dev\/tcp\/\d{1,3}\.\d{1,3}|nc\s+(?:-[a-zA-Z]*e|--exec)|ncat\s+(?:-[a-zA-Z]*e|--exec)|mkfifo\s+\/tmp)/i
  const revShellMatch = trimmed.match(reverseShellRegex)
  if (revShellMatch) {
    risks.push({
      severity: 'critical',
      type: 'network_payload',
      title: 'Reverse Shell or Socket Redirection',
      description:
        'Contains patterns characteristic of reverse shell payloads or unauthorized network socket redirection.',
      snippet: revShellMatch[0],
    })
  }

  // Calculate score & risk level
  let score = 100
  let hasCritical = false
  let hasHigh = false
  let hasMedium = false
  let hasLow = false

  for (const risk of risks) {
    if (risk.severity === 'critical') {
      hasCritical = true
      score -= 45
    } else if (risk.severity === 'high') {
      hasHigh = true
      score -= 25
    } else if (risk.severity === 'medium') {
      hasMedium = true
      score -= 15
    } else if (risk.severity === 'low') {
      hasLow = true
      score -= 5
    }
  }

  if (hasCritical) {
    score = Math.min(score, 20)
  } else if (hasHigh) {
    score = Math.min(score, 55)
  } else if (hasMedium) {
    score = Math.min(score, 75)
  } else if (hasLow) {
    score = Math.min(score, 90)
  }

  score = Math.max(0, Math.min(100, score))

  let riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'safe' = 'safe'
  if (hasCritical) {
    riskLevel = 'critical'
  } else if (hasHigh) {
    riskLevel = 'high'
  } else if (hasMedium) {
    riskLevel = 'medium'
  } else if (hasLow) {
    riskLevel = 'low'
  } else {
    riskLevel = 'safe'
  }

  // Generate summary
  let summary = ''
  if (riskLevel === 'safe') {
    summary = 'Command appears safe. Standard package manager command with no detected suspicious patterns.'
  } else if (riskLevel === 'critical') {
    summary = `Critical risk detected (${risks.length} issue${risks.length > 1 ? 's' : ''}): ${risks[0].title}. Do not execute without thorough manual auditing.`
  } else if (riskLevel === 'high') {
    summary = `High risk detected (${risks.length} issue${risks.length > 1 ? 's' : ''}): ${risks[0].title}. Review package parameters and host privileges carefully.`
  } else if (riskLevel === 'medium') {
    summary = `Medium risk detected (${risks.length} issue${risks.length > 1 ? 's' : ''}): ${risks[0].title}. Transport encryption or download authenticity is weakened.`
  } else {
    summary = `Low risk detected (${risks.length} issue${risks.length > 1 ? 's' : ''}): ${risks[0].title}.`
  }

  // Generate recommendations
  const recommendations: string[] = []
  const riskTypes = new Set(risks.map((r) => r.type))

  if (riskTypes.has('pipe_to_shell')) {
    recommendations.push(
      'Never pipe remote web content directly into a shell. Download the script first, inspect its source code, and verify checksums before running.'
    )
  }
  if (riskTypes.has('elevated_privileges')) {
    recommendations.push(
      'Avoid running package installations with elevated privileges (sudo/doas/runas). Install packages in user space, virtual environments, or containerized sandboxes.'
    )
  }
  if (riskTypes.has('dangerous_flag')) {
    recommendations.push(
      'Remove flags that bypass security validation (--ignore-scripts, --force, --dangerously-skip-permissions) unless you are in a disposable test environment.'
    )
  }
  if (riskTypes.has('inline_execution')) {
    recommendations.push(
      'Avoid executing arbitrary inline script strings. Inspect and run scripts from audited local files instead of command line flags.'
    )
  }
  if (riskTypes.has('obfuscation')) {
    recommendations.push(
      'Do not execute commands containing obfuscated, hex-encoded, or base64-decoded payloads without deobfuscating and analyzing cleartext code.'
    )
  }
  if (riskTypes.has('insecure_protocol')) {
    recommendations.push(
      'Replace plain "http://" URLs with "https://" to prevent Man-In-The-Middle interception and tampering.'
    )
  }
  if (riskTypes.has('chained_download_execution')) {
    recommendations.push(
      'Separate download and execution steps so that external scripts can be inspected prior to execution.'
    )
  }
  if (riskTypes.has('network_payload')) {
    recommendations.push(
      'Immediately halt execution. Command exhibits characteristics of reverse shell or unauthorized network socket redirection.'
    )
  }

  if (recommendations.length === 0) {
    recommendations.push(
      'Verify the package name and author reputation on official registries before installing.'
    )
    recommendations.push('Ensure dependencies are locked and pinned to known versions.')
  }

  return {
    command,
    riskLevel,
    score,
    summary,
    risks,
    extractedEntities: {
      urls,
      packages,
      flags,
      elevatedPrivileges,
    },
    recommendations,
  }
}
