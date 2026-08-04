import type { Finding } from '@/lib/validator/types'

export const AI_PROVIDERS = ['openai', 'anthropic', 'opencode-go', 'opencode-zen'] as const

export type AiProvider = typeof AI_PROVIDERS[number]

export function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === 'string' && AI_PROVIDERS.includes(value as AiProvider)
}

export interface AiReviewConfig {
  provider: AiProvider
  apiKey: string
  model?: string
  redactSecrets: boolean
}

export interface AiReviewResult {
  summary: string
  riskExplanation: string
  findingExplanations: FindingExplanation[]
  remediationSteps: string
  executiveSummary?: string
}

export interface FindingExplanation {
  findingId: string
  title: string
  explanation: string
  riskLevel: string
  recommendation: string
  codeSuggestion?: string
}

const SECRET_PATTERNS: RegExp[] = [
  /(?:api[_-]?key|apikey|secret|token|password|passwd|auth[_-]?token|bearer|jwt)[:=]\s*["']?[A-Za-z0-9_\-.]{16,}["']?/gi,
  /sk-[A-Za-z0-9]{32,}/g,
  /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g,
]

export function redactSecrets(content: string): string {
  let result = content
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]')
  }
  return result
}

function buildPromptForFindings(findings: Finding[], skillName: string, totalFindings: number): string {
  return `You are AI Skill Shield, a security expert for AI agent skills. Analyze the following findings for "${skillName}" and provide:

1. A brief executive summary (2-3 sentences)
2. Risk explanation for each finding
3. Specific remediation steps
4. Safer code alternatives where applicable

The scan found ${totalFindings} findings in total. The ${findings.length} findings below are the highest-priority sample selected for this review.

Findings:
${findings.map(f => `- [${f.severity.toUpperCase()}] ${f.title} (${f.category}): ${f.message}${f.snippet ? `\n  Code: "${f.snippet.slice(0, 200)}"` : ''}${f.recommendation ? `\n  Recommended: ${f.recommendation}` : ''}`).join('\n')}

Format your response as JSON with keys: executiveSummary, findings (array of {title, explanation, riskLevel, recommendation, codeSuggestion}), overallRiskExplanation, remediationSteps.`
}

async function callAiApi(config: AiReviewConfig, prompt: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  let body: Record<string, unknown>

  if (config.provider === 'anthropic') {
    headers['x-api-key'] = config.apiKey
    headers['anthropic-version'] = '2023-06-01'
    body = {
      model: config.model || 'claude-3-haiku-20240307',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }
  } else {
    const isOpenCode = config.provider.startsWith('opencode-')
    headers['Authorization'] = `Bearer ${config.apiKey}`
    body = {
      model: config.model || (isOpenCode ? 'kimi-k2.7-code' : 'gpt-4o-mini'),
      max_tokens: isOpenCode ? 4000 : 2000,
      ...(isOpenCode ? { reasoning_effort: 'none' } : {}),
      messages: [{ role: 'user', content: prompt }],
    }
  }

  const apiUrl = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    'opencode-go': 'https://opencode.ai/zen/go/v1/chat/completions',
    'opencode-zen': 'https://opencode.ai/zen/v1/chat/completions',
  }[config.provider]

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI API error (${res.status}): ${err}`)
  }

  const data = await res.json()

  if (config.provider === 'anthropic') {
    return data.content?.[0]?.text || ''
  }
  return data.choices?.[0]?.message?.content || ''
}

function parseAiResponse(response: string): AiReviewResult {
  try {
    const parsed = JSON.parse(response.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''))
    return {
      summary: parsed.executiveSummary || parsed.summary || '',
      riskExplanation: parsed.overallRiskExplanation || parsed.riskExplanation || '',
      findingExplanations: (parsed.findings || []).map((f: Record<string, string>) => ({
        findingId: f.findingId || '',
        title: f.title || '',
        explanation: f.explanation || '',
        riskLevel: f.riskLevel || 'medium',
        recommendation: f.recommendation || '',
        codeSuggestion: f.codeSuggestion || undefined,
      })),
      remediationSteps: parsed.remediationSteps || '',
      executiveSummary: parsed.executiveSummary || undefined,
    }
  } catch {
    const extractSection = (section: string): string => {
      const re = new RegExp(`(?:##|\\*\\*)?\\s*${section}[\\s\\S]*?(?=\\n(?:##|\\*\\*|$)|\$)`, 'i')
      const match = response.match(re)
      return match ? match[0].replace(/^##\s*\w+\s*/m, '').trim() : ''
    }

    const findingBlocks: FindingExplanation[] = []
    const findingRe = /(?:^|\n)[-*]\s*\*\*([^*]+)\*\*:?\s*\n?([\s\S]*?)(?=\n[-*]\s*\*\*|\n##|\n$)/g
    let m
    while ((m = findingRe.exec(response)) !== null) {
      findingBlocks.push({
        findingId: '',
        title: m[1].trim(),
        explanation: m[2].trim().slice(0, 200),
        riskLevel: 'medium',
        recommendation: '',
      })
    }

    return {
      summary: extractSection('executive summary') || response.slice(0, 200),
      riskExplanation: extractSection('overall risk explanation'),
      findingExplanations: findingBlocks,
      remediationSteps: extractSection('remediation steps'),
    }
  }
}

export async function reviewFindings(
  findings: Finding[],
  skillName: string,
  config: AiReviewConfig,
  totalFindings = findings.length
): Promise<AiReviewResult> {
  const redactedFindings = config.redactSecrets
    ? findings.map(f => ({ ...f, snippet: f.snippet ? redactSecrets(f.snippet) : undefined }))
    : findings

  const prompt = buildPromptForFindings(redactedFindings, skillName, totalFindings)

  try {
    const response = await callAiApi(config, prompt)
    return parseAiResponse(response)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown AI error'
    return {
      summary: 'AI review unavailable',
      riskExplanation: `Could not connect to AI provider: ${message}`,
      findingExplanations: [],
      remediationSteps: 'Please check your API key configuration and try again.',
    }
  }
}
