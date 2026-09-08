export interface SandboxOptions {
  timeoutMs?: number // default 2000ms
  memoryLimitMb?: number // default 64mb
  allowNetwork?: boolean
  allowedPaths?: string[]
}

export interface SandboxExecutionResult {
  success: boolean
  exitCode: number
  executionTimeMs: number
  timedOut: boolean
  memoryExceeded: boolean
  stdout: string
  stderr: string
  attemptedActions: {
    networkCalls: string[]
    filesystemWrites: string[]
    processSpawns: string[]
    envAccesses: string[]
  }
  violations: SandboxViolation[]
}

export interface SandboxViolation {
  type: 'network' | 'filesystem' | 'process' | 'timeout' | 'memory' | 'env'
  severity: 'critical' | 'high' | 'medium'
  description: string
}
