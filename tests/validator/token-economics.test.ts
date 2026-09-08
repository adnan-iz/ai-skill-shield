import { describe, expect, it } from 'vitest'
import { profileTokenEconomics } from '@/lib/validator/token-economics'
import { analyzeTokens, validateTokens } from '@/lib/validator/tokens'

describe('Token Economics and KV-Cache Profiler', () => {
  it('evaluates cache efficiency and penalizes early dynamic placeholders', () => {
    const earlyDynamicBody = `
# Dynamic Runner
Current session: {{timestamp}}
Target user query: {{user_query}}

## Static Reference Documentation
Here is 2000 words of static instructions...
` + 'instruction '.repeat(500)

    const result = profileTokenEconomics(1500, 50, earlyDynamicBody)
    expect(result.cacheEfficiencyScore).toBeLessThan(70)
    expect(result.isCacheFriendly).toBe(false)
    expect(result.cacheRecommendations.some(r => r.includes('Dynamic placeholders'))).toBe(true)
  })

  it('rewards clean static prompt structures with high cache friendliness', () => {
    const cleanBody = `
# Invariant System Guidelines
Follow these exact coding rules for all responses.
` + 'guideline rule '.repeat(700)

    const result = profileTokenEconomics(1600, 50, cleanBody)
    expect(result.cacheEfficiencyScore).toBeGreaterThanOrEqual(80)
    expect(result.isCacheFriendly).toBe(true)
  })

  it('calculates multi-model inference cost estimates per 1,000 runs', () => {
    const result = profileTokenEconomics(2000, 100, 'Some body content')
    // 2,000 tokens * 1,000 runs = 2,000,000 tokens
    // Claude Sonnet: $3.00/1M -> $6.00
    // GPT-4o: $2.50/1M -> $5.00
    // Gemini Flash: $0.075/1M -> $0.15
    expect(result.estimatedCostPer1kRuns.claudeSonnet).toBeCloseTo(6.0)
    expect(result.estimatedCostPer1kRuns.gpt4o).toBeCloseTo(5.0)
    expect(result.estimatedCostPer1kRuns.geminiFlash).toBeCloseTo(0.15)
  })

  it('integrates cache efficiency into analyzeTokens and validateTokens', () => {
    const analysis = analyzeTokens('Sample content', { name: 'my-skill' }, 'Sample body')
    expect(analysis.cacheEfficiencyScore).toBeDefined()
    expect(analysis.estimatedCostPer1kRuns).toBeDefined()

    const validation = validateTokens('Sample content', { name: 'my-skill' }, 'Sample body')
    expect(validation.findings).toBeDefined()
  })
})
