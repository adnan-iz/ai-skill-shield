"use client"

import { buildInstallDecision } from '@/lib/report/install-decision'
import type { ValidationResult } from '@/lib/validator/types'

interface InstallVerdictProps {
  result: ValidationResult
  approvalStatus: 'pending' | 'approved' | 'rejected' | null
}

const toneClasses = {
  safe: 'border-shield-200 bg-shield-50/70 text-shield-900',
  warn: 'border-yellow-300 bg-yellow-50 text-yellow-900',
  danger: 'border-red-300 bg-red-50 text-red-900',
}

const dotClasses = {
  pass: 'bg-shield-500',
  warn: 'bg-yellow-500',
  fail: 'bg-red-500',
}

export default function InstallVerdict({ result, approvalStatus }: InstallVerdictProps) {
  const decision = buildInstallDecision(result, approvalStatus)
  const metadata = result.source?.repositoryMeta

  return (
    <div className={`rounded-xl border p-5 ${toneClasses[decision.tone]}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em]">Pre-install verdict</div>
          <h2 className="mt-2 text-2xl font-bold">{decision.label}</h2>
          <p className="mt-2 text-sm opacity-90">{decision.summary}</p>
        </div>

        {metadata && (
          <div className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
            <Meta label="Stars" value={Intl.NumberFormat('en-US').format(metadata.stars)} />
            <Meta label="Forks" value={Intl.NumberFormat('en-US').format(metadata.forks)} />
            <Meta label="Issues" value={Intl.NumberFormat('en-US').format(metadata.openIssues)} />
            <Meta label="License" value={metadata.license || 'Unknown'} />
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {decision.checklist.map((item) => (
          <div key={item.label} className="rounded-lg border border-black/10 bg-white/60 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className={`h-2.5 w-2.5 rounded-full ${dotClasses[item.status]}`} />
              {item.label}
            </div>
            <p className="mt-1 text-xs text-current/75">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/50 p-3">
      <div className="text-[11px] uppercase tracking-[0.14em] opacity-70">{label}</div>
      <div className="mt-1 font-semibold">{value}</div>
    </div>
  )
}
