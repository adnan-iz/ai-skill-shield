import { describe, expect, it } from 'vitest'
import { createGitHubAppJwt, githubNotificationBody } from '@/lib/github/notifications'
import type { ValidationResult } from '@/lib/validator/types'

function result(): ValidationResult {
  return {
    id: 'scan-1', timestamp: '2026-08-29T00:00:00.000Z', skillName: 'reviewer', overallScore: 86, riskLevel: 'medium',
    summary: { totalChecks: 1, passed: 1, warnings: 0, failed: 0, criticalCount: 0, highCount: 0, mediumCount: 1, lowCount: 0, infoCount: 0 },
    axes: [], findings: [{ id: 'f-1', axis: 'security', severity: 'medium', category: 'Security', title: 'Review', message: 'Review this.' }],
    compatibility: { agents: [], overallCompatibility: 0 }, tokenAnalysis: { totalTokens: 0, frontmatterTokens: 0, bodyTokens: 0, isUnderLimit: true, limit: 1, breakdown: [] },
    skillPreview: { frontmatter: {}, body: '', fileTree: [] },
    source: { type: 'github', owner: 'Acme', repo: 'skills', path: 'reviewer', sha: '0123456789012345678901234567890123456789', repositoryMeta: { fullName: 'Acme/skills', isPrivate: false, stars: 1, forks: 0, openIssues: 0, archived: false, isDefaultBranchHead: true } },
  }
}

describe('GitHub owner notifications', () => {
  it('builds an owner-facing body only for a publishable trust result', () => {
    const body = githubNotificationBody(result(), 'https://shield.example')
    expect(body).toContain('https://shield.example/trust/github/Acme/skills/reviewer')
    expect(body).toContain('https://shield.example/api/badge/github/Acme/skills/reviewer?v=2')
    expect(body).toContain('012345678901')
  })

  it('does not create a public notification body for a private or stale scan', () => {
    const privateResult = result()
    privateResult.source!.repositoryMeta!.isPrivate = true
    expect(githubNotificationBody(privateResult, 'https://shield.example')).toBeNull()
  })

  it('creates a three-segment GitHub App JWT', () => {
    const privateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC5YAeT+nf8E+1D\nh+8pAEEOBcaqxpLK+Q7tr9pwaNa9wXYCWfCqyvKAn12hZ9x78dsVYIefHwBVJvLQ\nlNvBlQ5pj37rsVJMvVAI9HraRpZwPthbNdPK5SfLGqoWoxpMp9kEWnZzYWHr/3zm\nNlYrh9d5EQHEYlOzBY8/FNJWgU04cN6J01Nlk+OtYkAXdxpXTp7Dd/4jo9OfoZvQ\n1SX9FvvOKMyULlmpgMIU6q/tClH4DONRjW6UvY16K9HXQQVA+GkWSj4gczHuwQSl\niH8qZENmKtDwG7Ew1VTZta6mdBi41/XTmM0ZkBZkDHi7a+6u3wXsGnHi1NCTGhmo\n+OZszm0VAgMBAAECggEAHnk0VbWvgr9t2hOfE7DogNsfORSyre46b4VglekOIByM\n/z70ysbZDZ7lH/L4cmGkX8PCF7zba6Qe9335ED4mI+FEfo9kVZwra4VxKq++7E3Q\neFIFco2wOHm2K0l9ucs/6DDM1xPTqp2R1TBqgvZuTAcpMLTvSHcqALc2CqVv4c6Y\naI/a5izq3zPaDIrZzZkgsoVGJvz5iJ4xKWV+TyuZUrOtzI+cTGokTEQcCUxPndBi\ngsriyd++wTnc52N5qgjZN3Vzmcgf0VFuEELHOz3yM8KIsiRnk/+sR2355fbyUxQd\nIxHvpAFyO+M+qas6IRo1i0DBUIVw54dHxFPuT0Pk4wKBgQDodLaLu3lHITtgzyfn\nmtpV8B/ej3mHQQWF7fqXI8OtrR9xrb7bg6i8Hzd0b5QLHr/SM6CrBu2NRrUbGgxO\nBzY/5vQvtsG/7wFq89FKNfpN2J95IhBRe2ihipydTVsFVodhdPII9KLn2JiM62pe\nKVLSNIxOTdk3w4xw5BEvC5yxlwKBgQDMJpI8iYTKegEVqhGTORZt7SmOvjubwZjM\nuIeoywvvp/H/O4R9ZhLvpkEJcAc6Hw3saYm72VDDmMIkqwTbl9gEFcm6dMXUrBCM\naB3Y10DygahejJDaCa3BE52UqIax407sSOhPBc7eIExtb7OI7wr+HF7NsAefTGsX\nJCBu12rUMwKBgQC5dJRG+vURGKRE4kEV+GeE9KSYbaMpk2iSp4CroG73Ww2hJlsE\nyw+NtuIJVROpo4iqbWIb0NUpR2YqDygOAJb5eIsMniQJuudIquko6dOe09q3S8P1\nHh4l825r2VFq+tPbnu+S0Yo+qoFavF8KbLGU3zOpLVbFtI+RaYOEIyGKVQKBgQDK\n0g87IYzR9EAbm+j2ESNddt9wt0JVThNWYIY2hfOH15yu7ByG0OBDQzMeAzTK44tb\nssZp4E9C5AMNlvKuj77G4DaYjeb1kTSnqdDtW31k8Lerp49Jb5A2YByQUpXvKVuB\nmDVkPOr297O2jeEaTBLpvpnZU+detfc2+GdYd5/kzQKBgQCBNj/SOePFdoa3Czpj\nc3Qj+3r9UHVVzL5EOTZXZz9TdpxVer28dHnUDqHpvjnPuPmSxYW24w82TLxe4Mf/\nnEhN3Ig4UiwHwekgzzCRMsslbnUa/432VANouh4L/butd2NwLRH84gu2T9AlCbQe\nInDsRxINsP58E6t5CitAQgzKnQ==\n-----END PRIVATE KEY-----`
    expect(createGitHubAppJwt('123', privateKey, 1_700_000_000).split('.')).toHaveLength(3)
  })
})
