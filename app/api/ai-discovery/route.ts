import { z } from 'zod'
import { AI_PROVIDERS, type AiProvider } from '@/lib/ai-review'
import { discoverSecurity } from '@/lib/ai-review/discovery'
import { sourceEvidence } from '@/lib/deep-scan/source-evidence'
import { getResult } from '@/lib/store'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'

export const runtime = 'nodejs'
const requestSchema = z.object({ scanId: z.string().min(1).max(100), consent: z.literal(true), provider: z.enum(AI_PROVIDERS).optional() }).strict()
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rate = await checkRateLimit(`ai-discovery:${ip}`, { maxRequests: 3, windowMs: 60_000 })
  const reply = (body: unknown, status = 200) => addRateLimitHeaders(Response.json(body, { status }), rate)
  if (!rate.allowed) return reply({ error: 'Too many requests' }, 429)
  let body: z.infer<typeof requestSchema>
  try { body = requestSchema.parse(await request.json()) } catch { return reply({ error: 'Expected scanId, consent:true and an optional supported provider.' }, 400) }
  const providers: Partial<Record<AiProvider, { apiKey?: string; model?: string }>> = {
    openai: { apiKey: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL },
    anthropic: { apiKey: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL },
    'opencode-go': { apiKey: process.env.OPENCODE_GO_API_KEY, model: process.env.OPENCODE_GO_MODEL },
    'opencode-zen': { apiKey: process.env.OPENCODE_ZEN_API_KEY, model: process.env.OPENCODE_ZEN_MODEL },
    openrouter: { apiKey: process.env.OPENROUTER_API_KEY, model: process.env.OPENROUTER_MODEL },
    gemini: { apiKey: process.env.GEMINI_API_KEY, model: process.env.GEMINI_MODEL },
  }
  const provider = body.provider || AI_PROVIDERS.find(candidate => providers[candidate]?.apiKey)
  if (!provider || provider === 'opencode-local' || !providers[provider]?.apiKey) return reply({ status: 'unavailable', findings: [], reason: 'A remote discovery provider is not configured; local tool-enabled OpenCode is unsupported.' })
  try {
    const scan = await getResult(body.scanId)
    if (!scan) return reply({ error: 'Stored scan not found' }, 404)
    const result = await discoverSecurity(scan.skillPreview.files || [], { provider, ...providers[provider], redactSecrets: true })
    return reply({ ...result, scanId: scan.id, provider, source: scan.source, sourceFiles: sourceEvidence(scan.skillPreview.files || []), deterministicFindings: scan.findings })
  } catch { return reply({ status: 'unavailable', findings: [], reason: 'Stored scan could not be read.' }, 503) }
}
