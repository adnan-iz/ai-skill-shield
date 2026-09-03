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
    const { findings, totalFindings, skillName, provider: requestedProvider } = await request.json() as {
      findings?: unknown
      totalFindings?: unknown
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

    const providerEnv: Record<AiProvider, { apiKey?: string; model?: string; localUrl?: string; localUsername?: string }> = {
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
      openrouter: { apiKey: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL },
      gemini: { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL },
      'opencode-local': {
        apiKey: process.env.OPENCODE_LOCAL_PASSWORD,
        localUrl: process.env.OPENCODE_LOCAL_URL,
        localUsername: process.env.OPENCODE_LOCAL_USERNAME,
      },
    }
    const provider = requestedProvider || AI_PROVIDERS.find(candidate => providerEnv[candidate].apiKey || providerEnv[candidate].localUrl)
    const providerSettings = provider ? providerEnv[provider] : undefined

    if (!provider || (!providerSettings?.apiKey && !providerSettings?.localUrl)) {
      const requiredKey = provider
        ? {
            openai: 'OPENAI_API_KEY',
            anthropic: 'ANTHROPIC_API_KEY',
            'opencode-go': 'OPENCODE_GO_API_KEY',
            'opencode-zen': 'OPENCODE_ZEN_API_KEY',
            openrouter: 'OPENROUTER_API_KEY',
            gemini: 'GEMINI_API_KEY',
            'opencode-local': 'OPENCODE_LOCAL_URL',
          }[provider]
        : 'OPENAI_API_KEY, ANTHROPIC_API_KEY, OPENCODE_GO_API_KEY, OPENCODE_ZEN_API_KEY, OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENCODE_LOCAL_URL'
      return addRateLimitHeaders(Response.json({
        error: 'AI review not configured',
        message: `Set ${requiredKey} to enable AI review`,
      }, { status: 501 }), rl)
    }

    const config = {
      provider,
      apiKey: providerSettings.apiKey,
      model: providerSettings.model,
      localUrl: providerSettings.localUrl,
      localUsername: providerSettings.localUsername,
      redactSecrets: true,
    }
    const reportedTotal = typeof totalFindings === 'number' && Number.isSafeInteger(totalFindings) && totalFindings >= findings.length
      ? totalFindings
      : findings.length
    const result = await reviewFindings(findings.slice(0, 50), skillName || 'Untitled Skill', config, reportedTotal)

    return addRateLimitHeaders(Response.json(result), rl)
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'AI review failed')
  }
}
