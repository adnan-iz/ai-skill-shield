import { AgentCompatibility, CompatibilityMatrix, SkillFile } from '@/lib/validator/types'

export interface AgentInfo {
  name: string
  id: string
  supported: boolean
  detectionPatterns: string[]
}

export const SUPPORTED_AGENTS: AgentInfo[] = [
  { name: 'Claude Code', id: 'claude-code', supported: true, detectionPatterns: ['Claude Code', 'claude-code', 'ClaudeCode', 'Bash(', 'ToolUse(', 'ToolResult', '.claude/', 'claude-3'] },
  { name: 'OpenCode', id: 'opencode', supported: true, detectionPatterns: ['OpenCode', 'opencode', 'open-code', 'tool_use', 'terminal(', '.opencode/'] },
  { name: 'Cursor', id: 'cursor', supported: true, detectionPatterns: ['Cursor', '@web', '@cursor', 'CursorRule', '.cursor/', 'cursor'] },
  { name: 'GitHub Copilot', id: 'github-copilot', supported: true, detectionPatterns: ['GitHub Copilot', 'github-copilot', 'github.copilot', 'copilot', 'gh copilot'] },
  { name: 'Windsurf', id: 'windsurf', supported: true, detectionPatterns: ['Windsurf', 'Codeium', 'windsurf', 'cascade', 'windsurf'] },
  { name: 'Codex CLI', id: 'codex', supported: true, detectionPatterns: ['Codex CLI', 'codex-cli', 'CodexCLI', 'codex_cli', 'codex'] },
  { name: 'Cline', id: 'cline', supported: true, detectionPatterns: ['Cline', 'ask:', 'task:', 'cline'] },
  { name: 'Amp', id: 'amp', supported: true, detectionPatterns: ['Amp', 'AmpConfig', 'amp-agent'] },
  { name: 'Goose', id: 'goose', supported: true, detectionPatterns: ['Goose', 'goose_mode', 'goose-mode', 'goose'] },
  { name: 'Manus', id: 'manus', supported: true, detectionPatterns: ['Manus', 'ManusConfig', 'manus-agent'] },
  { name: 'Replit Agent', id: 'replit', supported: true, detectionPatterns: ['Replit Agent', 'replit-agent', 'ReplitAgent', '.replit', 'nix', 'replit'] },
  { name: 'Aider', id: 'aider', supported: true, detectionPatterns: ['Aider', 'AiderConfig', 'aider-ai', 'aider'] },
  { name: 'Mistral Vibe', id: 'mistral-vibe', supported: true, detectionPatterns: ['Mistral Vibe', 'Mistral-Vibe', 'MistralVibe', 'vibe', 'mistral'] },
  { name: 'OpenClaw', id: 'openclaw', supported: true, detectionPatterns: ['OpenClaw', 'OpenClaw', 'openclaw', 'claw'] },
  { name: 'Zed AI', id: 'zed', supported: true, detectionPatterns: ['Zed AI', 'Zed-AI', 'ZedConfig', '.zed/', 'zed'] },
  { name: 'JetBrains AI', id: 'jetbrains', supported: true, detectionPatterns: ['JetBrains AI', 'JetBrains', 'IntelliJ', 'WebStorm', 'PyCharm', 'jetbrains', 'idea'] },
  { name: 'Trae', id: 'trae', supported: true, detectionPatterns: ['Trae', '.trae/', 'trae-agent'] },
  { name: 'Antigravity', id: 'antigravity', supported: true, detectionPatterns: ['Antigravity', 'antigravity', 'ag_', 'ag-'] },
  { name: 'Gemini CLI', id: 'gemini-cli', supported: true, detectionPatterns: ['Gemini CLI', 'Gemini-CLI', 'GeminiCLI', 'gcli', 'gemini'] },
  { name: 'Kiro', id: 'kiro', supported: true, detectionPatterns: ['Kiro', 'KiroAI', 'kiro-ai', 'kiro'] },
  { name: 'Roo', id: 'roo', supported: true, detectionPatterns: ['Roo', 'RooConfig', 'roo-cli', 'roo'] },
  { name: 'Continue', id: 'continue', supported: true, detectionPatterns: ['Continue', 'ContinueConfig', '.continue/', 'continue.dev'] },
  { name: 'Sourcegraph Cody', id: 'sourcegraph', supported: true, detectionPatterns: ['Sourcegraph Cody', 'Sourcegraph-Cody', 'SourcegraphCody', 'cody', 'sourcegraph', 'sg '] },
]

function matchPattern(content: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const isSimpleName = /^[a-zA-Z][a-zA-Z0-9_-]*$/.test(pattern)
  const regex = isSimpleName ? new RegExp(`\\b${escaped}\\b`, 'i') : new RegExp(escaped, 'i')
  return regex.test(content)
}

function countPatternMatches(content: string, patterns: string[]): number {
  let count = 0
  for (const pattern of patterns) {
    if (matchPattern(content, pattern)) count++
  }
  return count
}

function findPatternMatches(content: string, patterns: string[]): string[] {
  const found: string[] = []
  for (const pattern of patterns) {
    if (matchPattern(content, pattern)) found.push(pattern)
  }
  return found
}

function determineStatus(matchCount: number, fileMatchCount: number): AgentCompatibility['status'] {
  if (matchCount >= 2 || (matchCount >= 1 && fileMatchCount >= 1)) return 'full'
  if (matchCount >= 1 || fileMatchCount >= 1) return 'partial'
  return 'unknown'
}

function buildNotes(matchCount: number, fileMatchCount: number, patterns: string[], filePatterns: string[]): string {
  const parts: string[] = []
  if (matchCount > 0) parts.push(`Content matches ${matchCount} pattern${matchCount > 1 ? 's' : ''}: ${patterns.join(', ')}`)
  if (fileMatchCount > 0) parts.push(`Files match ${fileMatchCount} pattern${fileMatchCount > 1 ? 's' : ''}: ${filePatterns.join(', ')}`)
  return parts.join('; ') || ''
}

export function detectCompatibility(
  content: string,
  files: SkillFile[]
): CompatibilityMatrix {
  const filePaths = files.map(f => f.path.replace(/\\/g, '/'))
  const fullText = [content, ...files.map(f => f.content)].join('\n')
  const hasStandardSkill = filePaths.some(path => /(^|\/)SKILL\.md$/i.test(path))

  const agents: AgentCompatibility[] = SUPPORTED_AGENTS.map(agent => {
    const contentMatches = findPatternMatches(content, agent.detectionPatterns)
    const fileMatches = findPatternMatches(filePaths.join('\n'), agent.detectionPatterns)
    const _totalMatchCount = countPatternMatches(fullText, agent.detectionPatterns)

    const status = determineStatus(contentMatches.length, fileMatches.length)
    const notes = buildNotes(contentMatches.length, fileMatches.length, contentMatches, fileMatches)

    return { name: agent.name, id: agent.id, status, notes: notes || undefined }
  })

  const hasNewSpecPatterns = /allowed-tools|allowed_tools|allowedTools/i.test(content)
  if (hasNewSpecPatterns) {
    for (const agent of agents) {
      if (agent.status === 'unknown') {
        agent.status = 'partial'
        agent.notes = agent.notes
          ? `${agent.notes}; Uses allowed-tools (new spec, broad compatibility)`
          : 'Uses allowed-tools (new spec, broad compatibility)'
      }
    }
  }

  if (hasStandardSkill) {
    for (const agent of agents) {
      if (agent.status === 'unknown') {
        agent.status = 'partial'
        agent.notes = 'Standard Agent Skills format; runtime-specific behavior not verified'
      }
    }
  }

  const hasMCP = /mcp|model\.context\.protocol/i.test(content)
  if (hasMCP) {
    const mcpAgentIds = ['cline', 'roo', 'continue', 'cursor', 'opencode']
    for (const agent of agents) {
      if (mcpAgentIds.includes(agent.id)) {
        agent.status = agent.status === 'full' ? 'full' : 'partial'
        agent.notes = agent.notes
          ? `${agent.notes}; MCP compatible`
          : 'MCP compatible'
      }
    }
  }

  const fullCount = agents.filter(a => a.status === 'full').length
  const partialCount = agents.filter(a => a.status === 'partial').length
  const _knownCount = fullCount + partialCount
  const _unknownCount = agents.filter(a => a.status === 'unknown').length

  let overallCompatibility: number
  if (fullCount >= 3) {
    overallCompatibility = 90
  } else if (fullCount >= 1) {
    overallCompatibility = 70 + Math.round((fullCount / agents.length) * 20)
  } else if (partialCount >= 3) {
    overallCompatibility = 50
  } else if (partialCount >= 1) {
    overallCompatibility = 30
  } else {
    overallCompatibility = 10
  }

  return { agents, overallCompatibility }
}
