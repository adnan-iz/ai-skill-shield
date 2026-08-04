import { afterEach, describe, expect, it, vi } from 'vitest'
import { reviewFindings, type AiProvider } from '@/lib/ai-review'
import type { Finding } from '@/lib/validator/types'

const finding: Finding = {
  id: 'finding-1',
  axis: 'security',
  severity: 'high',
  category: 'command-injection',
  title: 'Pipe to shell',
  message: 'A downloaded script is executed directly.',
}

async function reviewWith(provider: AiProvider) {
  return reviewFindings([finding], 'test-skill', {
    provider,
    apiKey: 'test-key',
    redactSecrets: true,
  })
}

describe('OpenCode AI review providers', () => {
  afterEach(() => vi.unstubAllGlobals())

  it.each([
    ['opencode-go', 'https://opencode.ai/zen/go/v1/chat/completions'],
    ['opencode-zen', 'https://opencode.ai/zen/v1/chat/completions'],
  ] as const)('sends %s reviews to its chat completions endpoint', async (provider, endpoint) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '```json\n{"executiveSummary":"Reviewed"}\n```' } }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const review = await reviewWith(provider)

    expect(fetchMock).toHaveBeenCalledWith(endpoint, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
    }))
    const request = fetchMock.mock.calls[0][1]
    expect(JSON.parse(request.body)).toMatchObject({
      model: 'kimi-k2.7-code',
      max_tokens: 4000,
      reasoning_effort: 'none',
    })
    expect(review.executiveSummary).toBe('Reviewed')
  })

  it('tells the provider when a review is a bounded repository sample', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"executiveSummary":"Reviewed"}' } }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await reviewFindings([finding], 'large-repository', {
      provider: 'opencode-go',
      apiKey: 'test-key',
      redactSecrets: true,
    }, 7856)

    const request = fetchMock.mock.calls[0][1]
    const prompt = JSON.parse(request.body).messages[0].content
    expect(prompt).toContain('The scan found 7856 findings in total')
    expect(prompt).toContain('The 1 findings below are the highest-priority sample')
  })
})
