import type { Finding } from '@/lib/validator/types'
import type { LspDiagnostic, LspQuickFix, LspRange } from './types'

export function mapSeverity(severity: Finding['severity']): 1 | 2 | 3 | 4 {
  switch (severity) {
    case 'critical':
    case 'high':
      return 1
    case 'medium':
      return 2
    case 'low':
      return 3
    case 'info':
      return 4
    default:
      return 2
  }
}

function resolveFileContent(
  filePath?: string,
  fileContentMap?: Record<string, string>
): string | undefined {
  if (!fileContentMap) return undefined
  if (!filePath) {
    const keys = Object.keys(fileContentMap)
    return keys.length === 1 ? fileContentMap[keys[0]] : undefined
  }

  if (fileContentMap[filePath] !== undefined) {
    return fileContentMap[filePath]
  }

  const normalized = filePath.replace(/\\/g, '/').replace(/^\.\//, '')
  for (const [key, content] of Object.entries(fileContentMap)) {
    const normKey = key.replace(/\\/g, '/').replace(/^\.\//, '')
    if (
      normKey === normalized ||
      normKey.endsWith('/' + normalized) ||
      normalized.endsWith('/' + normKey)
    ) {
      return content
    }
  }

  const keys = Object.keys(fileContentMap)
  if (keys.length === 1) {
    return fileContentMap[keys[0]]
  }

  return undefined
}

function getRangeFromIndex(content: string, startIdx: number, length: number): LspRange {
  const before = content.slice(0, startIdx)
  const newlinesBefore = (before.match(/\n/g) || []).length
  const lastNewline = before.lastIndexOf('\n')
  const startChar = lastNewline === -1 ? startIdx : startIdx - (lastNewline + 1)

  const matched = content.slice(startIdx, startIdx + length)
  const newlinesInMatch = (matched.match(/\n/g) || []).length
  const endLine = newlinesBefore + newlinesInMatch
  const lastNewlineInMatch = matched.lastIndexOf('\n')
  const endChar =
    lastNewlineInMatch === -1
      ? startChar + length
      : matched.length - (lastNewlineInMatch + 1)

  return {
    start: { line: newlinesBefore, character: startChar },
    end: { line: endLine, character: endChar },
  }
}

export function calculateRange(
  finding: Finding,
  fileContent?: string
): LspRange {
  // Case 1: fileContent is available
  if (fileContent !== undefined) {
    const lines = fileContent.split(/\r?\n/)
    const hasLineNumber = finding.lineNumber !== undefined && finding.lineNumber > 0
    const lineIdx = hasLineNumber ? finding.lineNumber! - 1 : 0

    // If snippet is present, check if it's on this line or in the content
    if (finding.snippet) {
      const snippet = finding.snippet

      // 1. Try finding snippet on the specified line
      if (hasLineNumber && lineIdx >= 0 && lineIdx < lines.length) {
        const lineText = lines[lineIdx]
        const colInLine = lineText.indexOf(snippet)
        if (colInLine !== -1) {
          return {
            start: { line: lineIdx, character: colInLine },
            end: { line: lineIdx, character: colInLine + snippet.length },
          }
        }
        // Try trimmed snippet
        const trimmed = snippet.trim()
        const colTrimmed = lineText.indexOf(trimmed)
        if (colTrimmed !== -1) {
          return {
            start: { line: lineIdx, character: colTrimmed },
            end: { line: lineIdx, character: colTrimmed + trimmed.length },
          }
        }
      }

      // 2. Try locating snippet in the entire fileContent
      const snippetIndex = fileContent.indexOf(snippet)
      if (snippetIndex !== -1) {
        return getRangeFromIndex(fileContent, snippetIndex, snippet.length)
      }
      const trimmed = snippet.trim()
      const trimmedIndex = fileContent.indexOf(trimmed)
      if (trimmedIndex !== -1) {
        return getRangeFromIndex(fileContent, trimmedIndex, trimmed.length)
      }

      // 3. Snippet provided but not found literally in content
      if (hasLineNumber && lineIdx >= 0 && lineIdx < lines.length) {
        const lineText = lines[lineIdx]
        const startChar = finding.column && finding.column > 0 ? finding.column - 1 : 0
        const endChar = Math.min(lineText.length, startChar + snippet.length)
        return {
          start: { line: lineIdx, character: startChar },
          end: { line: lineIdx, character: Math.max(startChar, endChar) },
        }
      }
    }

    // No snippet or snippet couldn't be matched
    if (hasLineNumber && lineIdx >= 0 && lineIdx < lines.length) {
      const lineText = lines[lineIdx]
      const startChar = finding.column && finding.column > 0 ? finding.column - 1 : 0
      return {
        start: { line: lineIdx, character: startChar },
        end: { line: lineIdx, character: lineText.length },
      }
    }

    // Default with content: line 0
    const firstLineLen = lines[0] ? lines[0].length : 0
    return {
      start: { line: 0, character: 0 },
      end: { line: 0, character: firstLineLen },
    }
  }

  // Case 2: fileContent is not available
  const hasLineNumber = finding.lineNumber !== undefined && finding.lineNumber > 0
  const lineIdx = hasLineNumber ? finding.lineNumber! - 1 : 0
  const startChar = finding.column && finding.column > 0 ? finding.column - 1 : 0
  const snippetLen = finding.snippet ? finding.snippet.length : 0

  return {
    start: { line: lineIdx, character: startChar },
    end: { line: lineIdx, character: startChar + snippetLen },
  }
}

export function generateQuickFix(
  finding: Finding,
  range: LspRange,
  _fileContent?: string
): LspQuickFix | undefined {
  const snippet = finding.snippet || ''
  const title = finding.title || ''
  const message = finding.message || ''
  const ruleId = finding.ruleId || ''
  const category = finding.category || ''

  // 1. Dangerous package flags (--ignore-scripts, etc.)
  const dangerousFlagMatch = snippet.match(/(?:^|\s)(--(?:ignore-scripts|dangerously-skip-permissions|no-verify|insecure|allow-all))(?:[\s=]|$)/i)
    || message.match(/(?:^|\s)(--(?:ignore-scripts|dangerously-skip-permissions|no-verify|insecure|allow-all))(?:[\s=]|$)/i)
    || title.match(/(?:^|\s)(--(?:ignore-scripts|dangerously-skip-permissions|no-verify|insecure|allow-all))(?:[\s=]|$)/i)

  if (dangerousFlagMatch || snippet.includes('--ignore-scripts') || message.includes('--ignore-scripts') || title.includes('--ignore-scripts')) {
    const flag = dangerousFlagMatch ? dangerousFlagMatch[1].trim() : '--ignore-scripts'
    let newText = ''
    if (snippet) {
      if (snippet.trim() === flag) {
        newText = ''
      } else {
        newText = snippet.replace(new RegExp(`\\s*${flag}\\b`, 'i'), '').trim()
      }
    }

    return {
      title: `Remove dangerous flag (${flag})`,
      edit: {
        range,
        newText,
      },
    }
  }

  // 2. Pipe to shell (curl | bash, wget | sh)
  const isPipeToShell = /(?:curl|wget)\s+[^|&;\n]+?\|\s*(?:ba|z|da)?sh/i.test(snippet)
    || /(?:curl|wget).*?\|\s*(?:bash|sh)/i.test(snippet)
    || title.toLowerCase().includes('pipes network to shell')
    || title.toLowerCase().includes('pipe to shell')
    || message.toLowerCase().includes('pipe-to-shell')
    || ruleId === 'install-pipe-shell'

  if (isPipeToShell) {
    const urlMatch = (snippet || message).match(/https?:\/\/[^\s|'"]+/)
    const url = urlMatch ? urlMatch[0] : 'https://example.com/install.sh'
    const isWget = /wget/i.test(snippet)
    const newText = isWget
      ? `wget ${url} -O install.sh && cat install.sh && bash install.sh`
      : `curl -fsSL ${url} -o install.sh && cat install.sh && bash install.sh`

    return {
      title: 'Download and inspect script before execution',
      edit: {
        range,
        newText,
      },
    }
  }

  // 3. Missing parameter description
  const isMissingParamDoc = ruleId === 'SS-MCP-PARAM-DOC'
    || category === 'mcp-missing-description'
    || title.toLowerCase().includes('undocumented parameter')
    || title.toLowerCase().includes('missing parameter description')
    || message.toLowerCase().includes('lacks a description')
    || message.toLowerCase().includes('missing parameter description')

  if (isMissingParamDoc) {
    let newText = 'description: "..."'
    if (snippet) {
      if (snippet.includes('{\n')) {
        newText = snippet.replace(/\{\n/, '{\n    description: "...",\n')
      } else if (snippet.includes('{')) {
        newText = snippet.replace(/\{(\s*)/, '{\n  description: "...",$1')
      } else if (snippet.trim().endsWith(':')) {
        newText = `${snippet}\n  description: "..."`
      } else {
        newText = `${snippet}\n  description: "..."`
      }
    }

    return {
      title: 'Add parameter description',
      edit: {
        range,
        newText,
      },
    }
  }

  // 4. Undeclared permissions
  const isUndeclaredPerm = ruleId === 'SS-DRIFT-NET'
    || ruleId === 'SS-DRIFT-FS'
    || ruleId === 'SS-DRIFT-EXEC'
    || category === 'capability-drift'
    || category === 'permission-violation'
    || title.toLowerCase().includes('undeclared')
    || (title.toLowerCase().includes('permission') && title.toLowerCase().includes('violation'))

  if (isUndeclaredPerm) {
    let permissionBlock = `---permissions
permissions:
  network:
    allow:
      - "*"
  filesystem:
    read:
      - "."
    write:
      - "."
  shell:
    allow:
      - "*"
---
`

    const combinedText = `${ruleId} ${title} ${message}`.toLowerCase()
    if (ruleId === 'SS-DRIFT-NET' || combinedText.includes('network')) {
      permissionBlock = `---permissions
permissions:
  network:
    allow:
      - "*"
---
`
    } else if (ruleId === 'SS-DRIFT-FS' || combinedText.includes('filesystem')) {
      permissionBlock = `---permissions
permissions:
  filesystem:
    read:
      - "."
    write:
      - "."
---
`
    } else if (ruleId === 'SS-DRIFT-EXEC' || combinedText.includes('shell') || combinedText.includes('execution') || combinedText.includes('process')) {
      permissionBlock = `---permissions
permissions:
  shell:
    allow:
      - "*"
---
`
    }

    return {
      title: 'Declare permission in manifest',
      edit: {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
        newText: permissionBlock,
      },
    }
  }

  return undefined
}

export function convertToLspDiagnostics(
  findings: Finding[],
  fileContentMap?: Record<string, string>
): LspDiagnostic[] {
  return findings.map((finding) => {
    const fileContent = resolveFileContent(finding.filePath, fileContentMap)
    const range = calculateRange(finding, fileContent)
    const severity = mapSeverity(finding.severity)
    const quickFix = generateQuickFix(finding, range, fileContent)

    const diagnostic: LspDiagnostic = {
      range,
      severity,
      source: 'skillshield',
      message: finding.message || finding.title || 'SkillShield finding',
      code: finding.ruleId || finding.id,
      ruleId: finding.ruleId,
    }

    if (quickFix) {
      diagnostic.quickFix = quickFix
    }

    return diagnostic
  })
}