"use client"

import { countFileTree } from '@/lib/report/metrics'
import type { ValidationResult } from '@/lib/validator/types'

interface DashboardCardsProps {
  result: ValidationResult
}

export default function DashboardCards({ result }: DashboardCardsProps) {
  const criticalCount = result.summary.criticalCount
  const secretsCount = result.findings.filter(f => f.category === 'secret-detection' || f.category === 'secrets').length
  const dangerousCommands = result.findings.filter(f => f.category === 'command-injection' || f.category === 'shell-execution').length
  const externalDomains = result.findings.filter(f => f.category === 'external-calls' || f.category === 'network').length
  const filesScanned = countFileTree(result.skillPreview.fileTree)
  const batchScope = result.batch
    ? `Across ${result.batch.totalSkills.toLocaleString('en-US')} skills · ${(result.findings.length / result.batch.totalSkills).toFixed(1)} average`
    : undefined

  const cards = [
    { label: 'Static Score', value: `${result.overallScore}/100`, icon: 'speed', color: result.overallScore >= 70 ? 'text-primary' : result.overallScore >= 50 ? 'text-amber-400' : 'text-error' },
    { label: 'Highest Finding', value: result.riskLevel.toUpperCase(), icon: 'shield', color: result.riskLevel === 'safe' || result.riskLevel === 'low' ? 'text-primary' : result.riskLevel === 'medium' ? 'text-amber-400' : 'text-error' },
    { label: 'Total Findings', value: result.findings.length.toLocaleString('en-US'), scope: batchScope, icon: 'description', color: result.findings.length > 0 ? 'text-amber-400' : 'text-primary' },
    { label: 'Critical Findings', value: String(criticalCount), icon: 'report', color: criticalCount > 0 ? 'text-error' : 'text-primary' },
    { label: 'Secrets Found', value: String(secretsCount), icon: 'key', color: secretsCount > 0 ? 'text-error' : 'text-primary' },
    { label: 'Dangerous Commands', value: String(dangerousCommands), icon: 'terminal', color: dangerousCommands > 0 ? 'text-error' : 'text-primary' },
    { label: 'External Calls', value: String(externalDomains), icon: 'language', color: externalDomains > 0 ? 'text-amber-400' : 'text-primary' },
    { label: result.batch ? 'Skill Files' : 'Files Scanned', value: filesScanned.toLocaleString('en-US'), icon: 'folder_open', color: 'text-on-surface' },
  ]

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-outline-variant/40 bg-surface-container-low/70 backdrop-blur-md p-3 flex flex-col items-center justify-center text-center hover:border-primary/40 transition-colors"
        >
          <span className={`material-symbols-outlined text-xl mb-1 ${card.color}`}>{card.icon}</span>
          <div className="text-base font-bold font-mono text-on-surface">{card.value}</div>
          <div className="text-[9px] font-mono font-semibold uppercase tracking-wider text-on-surface-secondary mt-0.5">{card.label}</div>
          {card.scope && <div className="mt-0.5 text-[9px] font-mono text-on-surface-secondary/70">{card.scope}</div>}
        </div>
      ))}
    </div>
  )
}
