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

async function reviewWith(provider: AiProvider, apiKey = 'test-key') {
  return reviewFindings([finding], 'test-skill', {
    provider,
    apiKey,
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
    })
    expect(JSON.parse(request.body)).not.toHaveProperty('reasoning_effort')
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

  it.each([
    ['openrouter', 'https://openrouter.ai/api/v1/chat/completions'],
    ['gemini', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'],
  ] as const)('sends %s reviews through its OpenAI-compatible endpoint', async (provider, endpoint) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: '{"executiveSummary":"Reviewed"}' } }],
    }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const review = await reviewWith(provider)

    expect(fetchMock).toHaveBeenCalledWith(endpoint, expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer test-key' }),
    }))
    expect(review.executiveSummary).toBe('Reviewed')
  })

  it('sends a redacted review request to a local OpenCode session', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'session-123' }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        info: { id: 'message-123' },
        parts: [{ type: 'text', text: '{"executiveSummary":"Local review"}' }],
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const review = await reviewWith('opencode-local', '')

    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://127.0.0.1:4096/session', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ title: 'AI Skill Shield review' }),
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://127.0.0.1:4096/session/session-123/message', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"parts"'),
    }))
    expect(review.executiveSummary).toBe('Local review')
  })

  it('renders alternate summary and remediation response shapes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({
        summary: 'Reviewed',
        remediationSteps: ['Step one', 'Step two'],
      }) } }],
    }), { status: 200 })))

    const review = await reviewWith('opencode-go')

    expect(review.executiveSummary).toBe('Reviewed')
    expect(review.remediationSteps).toBe('Step one\nStep two')
  })
})
