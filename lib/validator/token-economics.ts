export interface CostEstimate {
  claudeSonnet: number
  gpt4o: number
  geminiFlash: number
}

export interface TokenEconomicsResult {
  cacheEfficiencyScore: number
  isCacheFriendly: boolean
  estimatedCostPer1kRuns: CostEstimate
  cacheRecommendations: string[]
}

// Token pricing per 1,000,000 tokens (USD)
const PRICING = {
  claudeSonnet: 3.0, // $3.00 / 1M tokens
  gpt4o: 2.5, // $2.50 / 1M tokens
  geminiFlash: 0.075, // $0.075 / 1M tokens
}

/**
 * Evaluates how friendly this skill definition is for LLM prompt caching (Anthropic, Gemini, OpenAI).
 * Prompt caching delivers up to 90% cost savings when static headers and invariant instructions
 * appear early and unbroken in the context.
 */
export function profileTokenEconomics(
  totalTokens: number,
  frontmatterTokens: number,
  body: string
): TokenEconomicsResult {
  const recommendations: string[] = []
  let cacheEfficiencyScore = 85 // baseline

  // 1. Check prompt structure for cache boundaries
  const lines = body.split('\n')
  const first50Lines = lines.slice(0, 50).join('\n')
  const hasDynamicPlaceholders = /\{\{\s*(?:date|time|timestamp|random|uuid|user_query|input)\s*\}\}/i.test(first50Lines)

  if (hasDynamicPlaceholders) {
    cacheEfficiencyScore -= 30
    recommendations.push(
      'Dynamic placeholders (e.g. {{timestamp}}, {{user_query}}) detected in the first 50 lines. Move dynamic variables to the end of the prompt to avoid invalidating prefix KV-caches.'
    )
  }

  // 2. Token size threshold for caching
  // Anthropic prompt caching requires >= 1024 tokens (Claude 3.5 Sonnet), Gemini >= 32,768 tokens
  if (totalTokens < 1024) {
    recommendations.push(
      `Skill total tokens (${totalTokens}) is below the minimum threshold (1,024 tokens) for Anthropic prompt caching.`
    )
  } else {
    cacheEfficiencyScore += 10
  }

  // 3. Excess frontmatter check
  const frontmatterRatio = totalTokens > 0 ? frontmatterTokens / totalTokens : 0
  if (frontmatterRatio > 0.35) {
    cacheEfficiencyScore -= 15
    recommendations.push(
      'Frontmatter consumes over 35% of total tokens. Reduce verbose YAML metadata to conserve context.'
    )
  }

  cacheEfficiencyScore = Math.max(0, Math.min(100, cacheEfficiencyScore))

  // 4. Calculate cost per 1,000 runs
  const costPer1k = {
    claudeSonnet: Number(((totalTokens * 1000 * PRICING.claudeSonnet) / 1_000_000).toFixed(4)),
    gpt4o: Number(((totalTokens * 1000 * PRICING.gpt4o) / 1_000_000).toFixed(4)),
    geminiFlash: Number(((totalTokens * 1000 * PRICING.geminiFlash) / 1_000_000).toFixed(4)),
  }

  return {
    cacheEfficiencyScore,
    isCacheFriendly: cacheEfficiencyScore >= 70,
    estimatedCostPer1kRuns: costPer1k,
    cacheRecommendations: recommendations,
  }
}
