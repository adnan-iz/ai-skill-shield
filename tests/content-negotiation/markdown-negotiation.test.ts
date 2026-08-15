import { describe, expect, test } from 'vitest'
import { acceptsMarkdown, markdownTokenEstimate } from '@/lib/markdown-negotiation'

describe('Markdown content negotiation', () => {
  test('accepts an explicit Markdown media type', () => {
    expect(acceptsMarkdown('text/html, text/markdown')).toBe(true)
    expect(acceptsMarkdown('text/markdown; q=0.9, text/html; q=0.8')).toBe(true)
  })

  test('keeps HTML as the default and honors q=0', () => {
    expect(acceptsMarkdown(null)).toBe(false)
    expect(acceptsMarkdown('text/html')).toBe(false)
    expect(acceptsMarkdown('text/markdown; q=0')).toBe(false)
  })

  test('estimates a positive token count', () => {
    expect(markdownTokenEstimate('hello')).toBe('2')
  })
})
