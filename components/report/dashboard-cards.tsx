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
    { label: 'Static Score', value: `${result.overallScore}/100`, icon: 'speed', color: result.overallScore >= 70 ? 'text-shield-500' : result.overallScore >= 50 ? 'text-yellow-500' : 'text-red-500' },
    { label: 'Highest Finding', value: result.riskLevel.toUpperCase(), icon: 'shield', color: result.riskLevel === 'safe' || result.riskLevel === 'low' ? 'text-shield-500' : result.riskLevel === 'medium' ? 'text-yellow-500' : 'text-red-500' },
    { label: 'Total Findings', value: result.findings.length.toLocaleString('en-US'), scope: batchScope, icon: 'description', color: result.findings.length > 0 ? 'text-yellow-500' : 'text-shield-500' },
    { label: 'Critical Findings', value: String(criticalCount), icon: 'report', color: criticalCount > 0 ? 'text-red-500' : 'text-shield-500' },
    { label: 'Secrets Found', value: String(secretsCount), icon: 'key', color: secretsCount > 0 ? 'text-red-500' : 'text-shield-500' },
    { label: 'Dangerous Commands', value: String(dangerousCommands), icon: 'terminal', color: dangerousCommands > 0 ? 'text-red-500' : 'text-shield-500' },
    { label: 'External Call Findings', value: String(externalDomains), icon: 'language', color: externalDomains > 0 ? 'text-yellow-500' : 'text-shield-500' },
    { label: result.batch ? 'Skill Files Scanned' : 'Files Scanned', value: filesScanned.toLocaleString('en-US'), icon: 'folder_open', color: 'text-on-surface' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="glass-card rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <span className={`material-symbols-outlined text-2xl mb-1 ${card.color}`}>{card.icon}</span>
          <div className="text-lg font-bold text-on-surface">{card.value}</div>
          <div className="text-[10px] font-medium uppercase tracking-wider text-on-surface-secondary">{card.label}</div>
          {card.scope && <div className="mt-1 text-[10px] text-on-surface-secondary">{card.scope}</div>}
        </div>
      ))}
    </div>
  )
}
