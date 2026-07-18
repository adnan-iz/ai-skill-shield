import { AI_PROVIDERS, isAiProvider, reviewFindings, type AiProvider } from '@/lib/ai-review'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'
import { serverError } from '@/lib/api-error'

export async function POST(request: Request) {
  const clientIp = (request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()) || 'unknown'
  const rl = await checkRateLimit(`ai-review:${clientIp}`)
  if (!rl.allowed) {
    return addRateLimitHeaders(
      new Response(JSON.stringify({ error: 'Too many requests' }), { status: 429, headers: { 'Content-Type': 'application/json' } }),
      rl
    )
  }

  try {
    const { findings, skillName, provider: requestedProvider } = await request.json() as {
      findings?: unknown
      skillName?: string
      provider?: unknown
    }

    if (!findings || !Array.isArray(findings) || findings.length === 0) {
      return addRateLimitHeaders(Response.json({ error: 'No findings to review' }, { status: 400 }), rl)
    }

    if (requestedProvider !== undefined && !isAiProvider(requestedProvider)) {
      return addRateLimitHeaders(Response.json({
        error: 'Unsupported AI provider',
        message: `Choose one of: ${AI_PROVIDERS.join(', ')}`,
      }, { status: 400 }), rl)
    }

    const providerEnv: Record<AiProvider, { apiKey: string | undefined; model?: string }> = {
      openai: { apiKey: process.env.OPENAI_API_KEY },
      anthropic: { apiKey: process.env.ANTHROPIC_API_KEY },
      'opencode-go': {
        apiKey: process.env.OPENCODE_GO_API_KEY,
        model: process.env.OPENCODE_GO_MODEL,
      },
      'opencode-zen': {
        apiKey: process.env.OPENCODE_ZEN_API_KEY,
        model: process.env.OPENCODE_ZEN_MODEL,
      },
    }
    const provider = requestedProvider || AI_PROVIDERS.find(candidate => providerEnv[candidate].apiKey)
    const providerSettings = provider ? providerEnv[provider] : undefined

    if (!provider || !providerSettings?.apiKey) {
      const requiredKey = provider
        ? {
            openai: 'OPENAI_API_KEY',
            anthropic: 'ANTHROPIC_API_KEY',
            'opencode-go': 'OPENCODE_GO_API_KEY',
            'opencode-zen': 'OPENCODE_ZEN_API_KEY',
          }[provider]
        : 'OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENCODE_GO_API_KEY, or OPENCODE_ZEN_API_KEY'
      return addRateLimitHeaders(Response.json({
        error: 'AI review not configured',
        message: `Set ${requiredKey} to enable AI review`,
      }, { status: 501 }), rl)
    }

    const config = {
      provider,
      apiKey: providerSettings.apiKey,
      model: providerSettings.model,
      redactSecrets: true,
    }
    const result = await reviewFindings(findings, skillName || 'Untitled Skill', config)

    return addRateLimitHeaders(Response.json(result), rl)
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'AI review failed')
  }
}
