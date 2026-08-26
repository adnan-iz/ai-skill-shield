import type { Finding } from '../scanner/types'

export function calculateScore(findings: Finding[]): number {
  let score = 100

  for (const f of findings) {
    switch (f.severity) {
      case 'critical': score -= 30; break
      case 'high': score -= 15; break
      case 'medium': score -= 7; break
      case 'low': score -= 2; break
    }
  }

  const hasSecret = findings.some(f => f.category === 'secret-detection')
  if (hasSecret) score = Math.min(score, 40)

  const hasDestructive = findings.some(f =>
    f.axis === 'security' && containsDestructiveCommand(f.message)
  )
  if (hasDestructive) score = Math.min(score, 35)

  const hasObfuscatedShell = findings.some(f =>
    f.category === 'obfuscation' && f.severity === 'high'
  )
  if (hasObfuscatedShell) score = Math.min(score, 30)

  return Math.max(0, Math.min(100, Math.round(score)))
}

function containsDestructiveCommand(message: string): boolean {
  const normalized = message.toLowerCase()
  if (normalized.includes('drop database') || normalized.includes('del /f /s')) return true

  const removeIndex = normalized.indexOf('rm ')
  return removeIndex !== -1 && normalized.indexOf('/', removeIndex + 3) !== -1
}

export function determineRiskLevel(
  score: number,
  findings: Finding[]
): 'critical' | 'high' | 'medium' | 'low' | 'safe' {
  for (const f of findings) {
    if (f.severity === 'critical') return 'critical'
  }
  for (const f of findings) {
    if (f.severity === 'high') return 'high'
  }
  for (const f of findings) {
    if (f.severity === 'medium') return 'medium'
  }
  for (const f of findings) {
    if (f.severity === 'low') return 'low'
  }
  return 'safe'
}

export function determineTrustDecision(
  score: number,
  _findings: Finding[]
): 'trusted' | 'review_required' | 'sandbox_only' | 'blocked' {
  if (score >= 80) return 'trusted'
  if (score >= 60) return 'review_required'
  if (score >= 30) return 'sandbox_only'
  return 'blocked'
}

export function getSummary(findings: Finding[]): {
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  infoCount: number
} {
  const summary = { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, infoCount: 0 }
  for (const f of findings) {
    switch (f.severity) {
      case 'critical': summary.criticalCount++; break
      case 'high': summary.highCount++; break
      case 'medium': summary.mediumCount++; break
      case 'low': summary.lowCount++; break
      case 'info': summary.infoCount++; break
    }
  }
  return summary
}
