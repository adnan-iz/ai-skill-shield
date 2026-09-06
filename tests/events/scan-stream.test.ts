import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import {
  ScanStreamController,
  formatSSE,
  type ScanStepName,
  type ScanStreamEvent,
} from '@/lib/events/scan-stream'
import { POST } from '@/app/api/validate/stream/route'
import type { ValidationResult } from '@/lib/validator/types'

async function readStreamEvents(response: Response): Promise<ScanStreamEvent[]> {
  expect(response.body).toBeDefined()
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let done = false
  let accumulated = ''

  while (!done) {
    const { value, done: streamDone } = await reader.read()
    if (value) {
      accumulated += decoder.decode(value, { stream: true })
    }
    done = streamDone
  }
  accumulated += decoder.decode()

  return ScanStreamController.parseEvents(accumulated)
}

describe('ScanStreamController formatting and step emission', () => {
  it('formats a ScanStreamEvent compliant with SSE protocol (data: ...\\n\\n)', () => {
    const controller = new ScanStreamController()
    const event: ScanStreamEvent = {
      step: 'init',
      progress: 0,
      message: 'Initializing scan engine...',
      timestamp: '2026-09-06T10:00:00.000Z',
    }

    const formatted = controller.formatEvent(event)
    expect(formatted).toBe(`data: ${JSON.stringify(event)}\n\n`)
    expect(formatSSE(event)).toBe(formatted)
  })

  it('emits steps with correct structure, progress, and ISO timestamp', () => {
    const controller = new ScanStreamController()
    const formatted = controller.emitStep('ast-parse', 15, 'Parsing AST')

    expect(formatted.startsWith('data: ')).toBe(true)
    expect(formatted.endsWith('\n\n')).toBe(true)

    const parsed = ScanStreamController.parseEvent(formatted)
    expect(parsed).not.toBeNull()
    expect(parsed?.step).toBe('ast-parse')
    expect(parsed?.progress).toBe(15)
    expect(parsed?.message).toBe('Parsing AST')
    expect(parsed?.timestamp).toBeDefined()
    expect(Number.isNaN(Date.parse(parsed!.timestamp))).toBe(false)
  })

  it('supports extra attributes including findingCount, partialScore, and custom data', () => {
    const controller = new ScanStreamController()
    const mockData = { score: 92, details: 'verified' }
    const formatted = controller.emitStep('secrets', 30, 'Scanning secrets', {
      findingCount: 3,
      partialScore: 85,
      data: mockData,
    })

    const parsed = ScanStreamController.parseEvent(formatted)
    expect(parsed?.findingCount).toBe(3)
    expect(parsed?.partialScore).toBe(85)
    expect(parsed?.data).toEqual(mockData)
  })

  it('enqueues encoded bytes into an underlying stream controller if provided', () => {
    const enqueueMock = vi.fn()
    const mockStreamController = {
      enqueue: enqueueMock,
      close: vi.fn(),
      error: vi.fn(),
    } as unknown as ReadableStreamDefaultController<Uint8Array>

    const controller = new ScanStreamController(mockStreamController)
    controller.emitStep('init', 0, 'Test enqueue')

    expect(enqueueMock).toHaveBeenCalledTimes(1)
    const enqueuedArg = enqueueMock.mock.calls[0][0]
    expect(enqueuedArg).toBeInstanceOf(Uint8Array)

    const decoded = new TextDecoder().decode(enqueuedArg)
    expect(decoded).toContain('"step":"init"')
    expect(decoded).toContain('"progress":0')
    expect(decoded.endsWith('\n\n')).toBe(true)
  })

  it('provides static helper methods for formatting, emission, and parsing', () => {
    const staticFormatted = ScanStreamController.emitStep('complete', 100, 'Done', {
      partialScore: 100,
    })

    expect(staticFormatted.startsWith('data: ')).toBe(true)
    const parsed = ScanStreamController.parseEvent(staticFormatted)
    expect(parsed?.step).toBe('complete')
    expect(parsed?.progress).toBe(100)
    expect(parsed?.partialScore).toBe(100)
  })
})

describe('Event sequence generation (0% to 100%)', () => {
  it('generates a complete sequential progression from 0% to 100%', () => {
    const sequence = ScanStreamController.generateSequence()

    expect(sequence.length).toBeGreaterThanOrEqual(7)
    expect(sequence[0].step).toBe('init')
    expect(sequence[0].progress).toBe(0)

    const last = sequence[sequence.length - 1]
    expect(last.step).toBe('complete')
    expect(last.progress).toBe(100)

    // Verify progress monotonicity
    for (let i = 0; i < sequence.length - 1; i++) {
      expect(sequence[i].progress).toBeLessThanOrEqual(sequence[i + 1].progress)
    }

    const stepNames = sequence.map((e) => e.step)
    const expectedSteps: ScanStepName[] = [
      'init',
      'ast-parse',
      'secrets',
      'obfuscation',
      'mcp-schema',
      'drift',
      'tokens',
      'finalizing',
      'complete',
    ]

    for (const step of expectedSteps) {
      expect(stepNames).toContain(step)
    }
  })

  it('allows applying overrides to specific steps in the generated sequence', () => {
    const sequence = ScanStreamController.generateSequence({
      secrets: { findingCount: 2 },
      complete: { partialScore: 95, data: { status: 'passed' } },
    })

    const secretsEvent = sequence.find((e) => e.step === 'secrets')
    expect(secretsEvent?.findingCount).toBe(2)

    const completeEvent = sequence.find((e) => e.step === 'complete')
    expect(completeEvent?.partialScore).toBe(95)
    expect(completeEvent?.data).toEqual({ status: 'passed' })
  })
})

describe('SSE formatting compliance', () => {
  it('strictly adheres to data: <json>\\n\\n format without unescaped newlines', () => {
    const controller = new ScanStreamController()
    const multilineMessage = 'Line 1\nLine 2\r\n"Quotes" and \\backslashes\\ and \t tabs'
    const formatted = controller.emitStep('ast-parse', 20, multilineMessage)

    expect(formatted.startsWith('data: ')).toBe(true)
    expect(formatted.endsWith('\n\n')).toBe(true)

    // Only the final \n\n should separate frames; no internal raw double newlines
    const rawContent = formatted.slice(6, -2)
    expect(rawContent.includes('\n\n')).toBe(false)

    const parsed = JSON.parse(rawContent) as ScanStreamEvent
    expect(parsed.message).toBe(multilineMessage)
  })

  it('parses multiple stream chunks seamlessly with parseEvents', () => {
    const e1: ScanStreamEvent = { step: 'init', progress: 0, message: 'First', timestamp: '2026-09-06T00:00:00Z' }
    const e2: ScanStreamEvent = { step: 'complete', progress: 100, message: 'Second', timestamp: '2026-09-06T00:01:00Z' }

    const combined = `${formatSSE(e1)}${formatSSE(e2)}`
    const parsed = ScanStreamController.parseEvents(combined)

    expect(parsed).toHaveLength(2)
    expect(parsed[0].step).toBe('init')
    expect(parsed[1].step).toBe('complete')
  })
})

describe('Streaming API route handler (POST /api/validate/stream)', () => {
  it('streams validation events for a valid skill payload from init to complete', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'sample-agent-skill',
        files: [
          {
            path: 'SKILL.md',
            content: `---
name: sample-agent-skill
description: A safe agent skill for document summarization.
---

# Sample Agent Skill

This skill summarizes documents safely.
`,
          },
        ],
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    const events = await readStreamEvents(response)
    expect(events.length).toBeGreaterThanOrEqual(6)

    const steps = events.map((e) => e.step)
    expect(steps).toContain('init')
    expect(steps).toContain('ast-parse')
    expect(steps).toContain('secrets')
    expect(steps).toContain('mcp-schema')
    expect(steps).toContain('drift')
    expect(steps).toContain('tokens')
    expect(steps).toContain('complete')

    // Initial event starts at 0%
    expect(events[0].step).toBe('init')
    expect(events[0].progress).toBe(0)

    // Final event completes at 100% with full ValidationResult
    const completeEvent = events.find((e) => e.step === 'complete')
    expect(completeEvent).toBeDefined()
    expect(completeEvent?.progress).toBe(100)
    expect(completeEvent?.partialScore).toBeGreaterThanOrEqual(0)
    expect(completeEvent?.findingCount).toBeDefined()

    const result = completeEvent?.data as ValidationResult
    expect(result).toBeDefined()
    expect(result.id).toBeDefined()
    expect(result.skillName).toBe('sample-agent-skill')
    expect(result.overallScore).toBeGreaterThanOrEqual(0)
    expect(result.riskLevel).toBeDefined()
    expect(result.summary).toBeDefined()
    expect(Array.isArray(result.findings)).toBe(true)
  })

  it('handles invalid JSON gracefully by emitting step: "error" before closing', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{ invalid-json',
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    const events = await readStreamEvents(response)
    expect(events.length).toBe(1)
    expect(events[0].step).toBe('error')
    expect(events[0].progress).toBe(100)
    expect(events[0].message).toMatch(/json/i)
  })

  it('handles empty or missing files gracefully by emitting step: "error"', async () => {
    const request = new NextRequest('http://localhost:3000/api/validate/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: [] }),
    })

    const response = await POST(request)
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/event-stream')

    const events = await readStreamEvents(response)
    expect(events.length).toBe(1)
    expect(events[0].step).toBe('error')
    expect(events[0].message).toMatch(/at least one file/i)
  })
})
