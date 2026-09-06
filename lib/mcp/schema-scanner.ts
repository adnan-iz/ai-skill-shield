import { Finding, SkillFile } from '@/lib/validator/types'

export interface McpToolDefinition {
  name: string
  description?: string
  inputSchema?: {
    type?: string
    properties?: Record<string, McpPropertySchema>
    required?: string[]
    [key: string]: unknown
  }
}

export interface McpPropertySchema {
  type?: string
  description?: string
  pattern?: string
  enum?: unknown[]
  maxLength?: number
  items?: unknown
  [key: string]: unknown
}

const PRECEDENCE_HIJACK_PATTERNS: Array<{ regex: RegExp; title: string; desc: string }> = [
  {
    regex: /(?:always|must)\s+(?:invoke|call|run|execute)\s+this\s+tool\s+(?:first|before)/i,
    title: 'Tool Precedence Hijacking',
    desc: 'Tool description attempts to force the agent to call this tool before any other tool or safety check.',
  },
  {
    regex: /(?:system\s+override|override\s+(?:all\s+)?(?:safety|system|previous)\s+instructions)/i,
    title: 'System Override in Tool Description',
    desc: 'Tool description contains instruction override directives targeting the host agent.',
  },
  {
    regex: /(?:ignore|bypass)\s+(?:all\s+)?(?:previous\s+instructions|safety\s+filters|user\s+confirmation)/i,
    title: 'Prompt Injection / Safety Bypass in Tool Description',
    desc: 'Tool description contains prompt injection attempting to bypass agent safety filters or confirmation steps.',
  },
  {
    regex: /do\s+not\s+(?:tell|inform|alert|ask)\s+the\s+user/i,
    title: 'Covert Tool Execution Directive',
    desc: 'Tool description instructs the AI agent to hide tool execution from the user.',
  },
  {
    regex: /IMPORTANT:\s*(?:you\s+must|always)\s+use\s+this\s+tool/i,
    title: 'Priority Stealing Directive',
    desc: 'Tool description attempts to artificially inflate tool priority using pseudo-system instructions.',
  },
]

const DANGEROUS_TOOL_OR_PARAM_NAMES = /^(command|cmd|shell|exec|script|eval|query|sql|code|payload|run|bash)$/i

/**
 * Extracts MCP tool definitions from JSON strings, mcp.json, markdown code blocks, or objects.
 */
export function extractMcpToolsFromContent(content: string): McpToolDefinition[] {
  const tools: McpToolDefinition[] = []

  // Try direct JSON parse
  try {
    const parsed = JSON.parse(content)
    if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.tools)) {
        for (const t of parsed.tools) {
          if (t && typeof t.name === 'string') tools.push(t)
        }
      } else if (Array.isArray(parsed)) {
        for (const t of parsed) {
          if (t && typeof t.name === 'string' && (t.inputSchema || t.description)) tools.push(t)
        }
      } else if (parsed.name && (parsed.inputSchema || parsed.description)) {
        tools.push(parsed)
      }
    }
  } catch {
    // Not valid JSON, continue to regex extract
  }

  // Look for ```json code blocks containing tools
  const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g
  let match: RegExpExecArray | null
  while ((match = jsonBlockRegex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1])
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.tools)) {
          for (const t of parsed.tools) {
            if (t && typeof t.name === 'string') tools.push(t)
          }
        } else if (parsed.name && (parsed.inputSchema || parsed.description)) {
          tools.push(parsed)
        }
      }
    } catch {
      // ignore malformed code blocks
    }
  }

  // Look for inline tool-like patterns: { name: "...", description: "...", inputSchema: { ... } }
  const inlineToolRegex = /{\s*["']?name["']?\s*:\s*["']([a-zA-Z0-9_-]+)["']\s*,\s*["']?description["']?\s*:\s*["']([^"']+)["']/g
  while ((match = inlineToolRegex.exec(content)) !== null) {
    const existing = tools.some(t => t.name === match![1])
    if (!existing) {
      tools.push({
        name: match[1],
        description: match[2],
      })
    }
  }

  return tools
}

/**
 * Scans MCP tool definitions for prompt injections, precedence hijacking, and schema vulnerabilities.
 */
export function scanMcpToolDefinitions(
  tools: McpToolDefinition[],
  filePath: string,
  startFindingId: number
): { findings: Finding[]; nextId: number } {
  const findings: Finding[] = []
  let counter = startFindingId

  for (const tool of tools) {
    // 1. Inspect tool description for poisoning and precedence hijacking
    if (tool.description) {
      for (const pattern of PRECEDENCE_HIJACK_PATTERNS) {
        if (pattern.regex.test(tool.description)) {
          findings.push({
            id: `finding-mcp-${++counter}`,
            axis: 'security',
            severity: 'high',
            category: 'mcp-description-poisoning',
            title: pattern.title,
            message: `Tool "${tool.name}": ${pattern.desc}`,
            filePath,
            snippet: tool.description.slice(0, 150),
            recommendation: `Remove directive language or override instructions from tool "${tool.name}" description. Describe solely what the tool does.`,
            ruleId: 'SS-MCP-HIJACK',
          })
        }
      }
    }

    // 2. Inspect inputSchema
    if (tool.inputSchema?.properties) {
      const properties = tool.inputSchema.properties
      for (const [paramName, propSchema] of Object.entries(properties)) {
        if (!propSchema || typeof propSchema !== 'object') continue

        // Check for missing parameter description
        if (!propSchema.description || propSchema.description.trim().length === 0) {
          findings.push({
            id: `finding-mcp-${++counter}`,
            axis: 'security',
            severity: 'low',
            category: 'mcp-missing-description',
            title: `Undocumented Parameter in Tool "${tool.name}"`,
            message: `Parameter "${paramName}" in tool "${tool.name}" lacks a description, which can lead to LLM hallucination and unintended tool invocation.`,
            filePath,
            snippet: `"${paramName}": ${JSON.stringify(propSchema)}`,
            recommendation: `Add a clear "description" explaining the expected format and purpose of parameter "${paramName}".`,
            ruleId: 'SS-MCP-PARAM-DOC',
          })
        }

        // Check for unconstrained dangerous parameters
        const isDangerousName = DANGEROUS_TOOL_OR_PARAM_NAMES.test(paramName) || DANGEROUS_TOOL_OR_PARAM_NAMES.test(tool.name)
        const isStringType = propSchema.type === 'string'
        const hasNoPattern = !propSchema.pattern
        const hasNoEnum = !propSchema.enum || propSchema.enum.length === 0
        const hasNoLimit = typeof propSchema.maxLength !== 'number' || propSchema.maxLength > 2048

        if (isDangerousName && isStringType && hasNoPattern && hasNoEnum && hasNoLimit) {
          findings.push({
            id: `finding-mcp-${++counter}`,
            axis: 'security',
            severity: 'medium',
            category: 'mcp-unconstrained-parameter',
            title: `Unconstrained Dangerous Parameter in Tool "${tool.name}"`,
            message: `Parameter "${paramName}" in tool "${tool.name}" accepts unbounded, unvalidated string input for an execution/command sink.`,
            filePath,
            snippet: `"${paramName}": ${JSON.stringify(propSchema)}`,
            recommendation: `Add a "pattern" (regex validation), "enum", or "maxLength" constraint to parameter "${paramName}" to prevent arbitrary injection.`,
            ruleId: 'SS-MCP-UNCONSTRAINED-SINK',
          })
        }
      }
    }
  }

  return { findings, nextId: counter }
}

/**
 * Main scanner function for scanning files for MCP tool declarations.
 */
export function scanFilesForMcp(files: SkillFile[]): Finding[] {
  const allFindings: Finding[] = []
  let counter = 0

  for (const file of files) {
    // Only scan files that might define tools (json, yaml, yml, md, ts, js, py)
    if (!/\.(json|yaml|yml|md|ts|js|py)$/i.test(file.path)) continue

    const tools = extractMcpToolsFromContent(file.content)
    if (tools.length > 0) {
      const { findings, nextId } = scanMcpToolDefinitions(tools, file.path, counter)
      counter = nextId
      allFindings.push(...findings)
    }
  }

  return allFindings
}
