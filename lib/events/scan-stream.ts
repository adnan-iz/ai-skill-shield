import type { SkillFile, SkillInput, ValidationResult } from '@/lib/validator/types'
import { scanForSecrets } from '@/lib/scanner/secrets'
import { scanObfuscation } from '@/lib/scanner/obfuscation'
import { scanFilesForMcp } from '@/lib/mcp'
import { analyzeCapabilityDrift } from '@/lib/scanner/capability-drift'

export type ScanStepName =
  | 'init'
  | 'ast-parse'
  | 'secrets'
  | 'obfuscation'
  | 'mcp-schema'
  | 'drift'
  | 'tokens'
  | 'finalizing'
  | 'complete'
  | 'error'

export interface ScanStreamEvent {
  step: ScanStepName
  progress: number // 0-100
  message: string
  timestamp: string
  findingCount?: number
  partialScore?: number
  data?: unknown
}

export interface ScanStepDefinition {
  step: ScanStepName
  progress: number
  message: string
}

export const SCAN_STEP_SEQUENCE: readonly ScanStepDefinition[] = [
  { step: 'init', progress: 0, message: 'Initializing scan engine and validating input...' },
  { step: 'ast-parse', progress: 15, message: 'Parsing AST and skill frontmatter...' },
  { step: 'secrets', progress: 30, message: 'Scanning for hardcoded secrets and credentials...' },
  { step: 'obfuscation', progress: 45, message: 'Checking for obfuscation and hidden payloads...' },
  { step: 'mcp-schema', progress: 60, message: 'Validating Model Context Protocol schema definitions...' },
  { step: 'drift', progress: 75, message: 'Analyzing capability drift and undeclared permissions...' },
  { step: 'tokens', progress: 90, message: 'Computing token economics and context consumption...' },
  { step: 'finalizing', progress: 95, message: 'Finalizing security analysis and building report...' },
  { step: 'complete', progress: 100, message: 'Scan complete' },
] as const

export function formatSSE(event: ScanStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

export class ScanStreamController {
  private streamController?: ReadableStreamDefaultController<Uint8Array>
  private encoder = new TextEncoder()

  constructor(streamController?: ReadableStreamDefaultController<Uint8Array>) {
    this.streamController = streamController
  }

  formatEvent(event: ScanStreamEvent): string {
    return formatSSE(event)
  }

  emitStep(
    step: ScanStepName,
    progress: number,
    message: string,
    extra?: Partial<ScanStreamEvent>
  ): string {
    const event: ScanStreamEvent = {
      step,
      progress,
      message,
      timestamp: extra?.timestamp ?? new Date().toISOString(),
      ...extra,
    }
    const formatted = this.formatEvent(event)
    if (this.streamController) {
      try {
        this.streamController.enqueue(this.encoder.encode(formatted))
      } catch {
        // Stream may be already closed or cancelled by client
      }
    }
    return formatted
  }

  close(): void {
    if (this.streamController) {
      try {
        this.streamController.close()
      } catch {
        // Stream already closed
      }
    }
  }

  error(err?: unknown): void {
    if (this.streamController) {
      try {
        this.streamController.error(err)
      } catch {
        // Stream already closed or errored
      }
    }
  }

  generateSequence(
    overrides?: Partial<Record<ScanStepName, Partial<ScanStreamEvent>>>
  ): ScanStreamEvent[] {
    return SCAN_STEP_SEQUENCE.map((def) => {
      const extra = overrides?.[def.step]
      return {
        step: def.step,
        progress: def.progress,
        message: def.message,
        timestamp: new Date().toISOString(),
        ...extra,
      }
    })
  }

  static formatEvent(event: ScanStreamEvent): string {
    return formatSSE(event)
  }

  static emitStep(
    step: ScanStepName,
    progress: number,
    message: string,
    extra?: Partial<ScanStreamEvent>
  ): string {
    const event: ScanStreamEvent = {
      step,
      progress,
      message,
      timestamp: extra?.timestamp ?? new Date().toISOString(),
      ...extra,
    }
    return ScanStreamController.formatEvent(event)
  }

  static generateSequence(
    overrides?: Partial<Record<ScanStepName, Partial<ScanStreamEvent>>>
  ): ScanStreamEvent[] {
    return new ScanStreamController().generateSequence(overrides)
  }

  static parseEvent(chunk: string): ScanStreamEvent | null {
    const trimmed = chunk.trim()
    const line = trimmed.split('\n').find((l) => l.startsWith('data:'))
    if (!line) return null
    try {
      const jsonStr = line.slice(5).trim()
      return JSON.parse(jsonStr) as ScanStreamEvent
    } catch {
      return null
    }
  }

  static parseEvents(streamText: string): ScanStreamEvent[] {
    return streamText
      .split('\n\n')
      .map((chunk) => ScanStreamController.parseEvent(chunk))
      .filter((event): event is ScanStreamEvent => event !== null)
  }
}

export async function runScanPipeline(
  input: SkillInput,
  controller: ScanStreamController,
  options?: { rescan?: boolean }
): Promise<ValidationResult> {
  const files: SkillFile[] = input.files || []
  const skillFile = files.find((f) => f.path.replace(/\\/g, '/').endsWith('SKILL.md'))
  const skillContent = skillFile ? skillFile.content : ''

  // 1. Init (0%)
  controller.emitStep('init', 0, 'Initializing scan engine and validating input...')

  // 2. AST Parse (15%)
  controller.emitStep('ast-parse', 15, 'Parsing AST and skill frontmatter...')

  // 3. Secrets (30%)
  let secretCount = 0
  try {
    for (const file of files) {
      secretCount += scanForSecrets(file.content, file.path).length
    }
  } catch {
    // Non-fatal scanner catch
  }
  controller.emitStep('secrets', 30, 'Scanning for hardcoded secrets and credentials...', {
    findingCount: secretCount,
  })

  // 4. Obfuscation (45%)
  let obfCount = 0
  try {
    for (const file of files) {
      obfCount += scanObfuscation(file.content, file.path).length
    }
  } catch {
    // Non-fatal scanner catch
  }
  controller.emitStep('obfuscation', 45, 'Checking for obfuscation and hidden payloads...', {
    findingCount: secretCount + obfCount,
  })

  // 5. MCP Schema (60%)
  let mcpCount = 0
  try {
    mcpCount = scanFilesForMcp(files).length
  } catch {
    // Non-fatal scanner catch
  }
  controller.emitStep('mcp-schema', 60, 'Validating Model Context Protocol schema definitions...', {
    findingCount: secretCount + obfCount + mcpCount,
  })

  // 6. Capability Drift (75%)
  let driftCount = 0
  try {
    const driftRes = analyzeCapabilityDrift(files, skillContent, 0)
    driftCount = driftRes.findings.length
  } catch {
    // Non-fatal scanner catch
  }
  controller.emitStep('drift', 75, 'Analyzing capability drift and undeclared permissions...', {
    findingCount: secretCount + obfCount + mcpCount + driftCount,
  })

  // 7. Tokens (90%)
  controller.emitStep('tokens', 90, 'Computing token economics and context consumption...')

  // 8. Finalizing (95%)
  controller.emitStep('finalizing', 95, 'Finalizing security analysis and building report...')

  // Run full validation / validateAndSave
  let result: ValidationResult
  try {
    const { validateAndSave } = await import('@/lib/validator/service')
    result = await validateAndSave(input, { rescan: options?.rescan })
  } catch {
    const { runFullValidation } = await import('@/lib/validator/orchestrator')
    result = await runFullValidation(input)
  }

  // 9. Complete (100%)
  controller.emitStep('complete', 100, 'Scan complete', {
    findingCount: result.findings.length,
    partialScore: result.overallScore,
    data: result,
  })

  return result
}
