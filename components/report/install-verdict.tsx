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
  neutral: 'bg-slate-400',
}

export default function InstallVerdict({ result, approvalStatus }: InstallVerdictProps) {
  const decision = buildInstallDecision(result, approvalStatus)
  const metadata = result.source?.repositoryMeta
  const contextualReviewCategories = new Set(['staged-malware', 'clickfix-attack', 'data-exfiltration', 'second-order-injection'])
  const manualReviewFindings = [...result.findings]
    .filter((finding) => finding.severity === 'critical' || finding.severity === 'high' || (
      finding.axis === 'security' && finding.severity === 'medium' && contextualReviewCategories.has(finding.category)
    ))
    .sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2 }
      return priority[a.severity as 'critical' | 'high' | 'medium'] - priority[b.severity as 'critical' | 'high' | 'medium']
    })
  const visibleReviewFindings = manualReviewFindings.slice(0, 5)

  return (
    <div className={`rounded-xl border p-5 ${toneClasses[decision.tone]}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="text-xs font-semibold uppercase tracking-[0.18em]">Primary install decision</div>
          <h2 className="mt-2 text-2xl font-bold">{decision.label}</h2>
          <p className="mt-2 text-sm opacity-90">{decision.summary}</p>
          {decision.reasons.length > 0 && (
            <div className="mt-4 rounded-lg border border-current/15 bg-white/45 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em]">Why this decision</div>
              <ul className="mt-2 space-y-1.5 text-sm">
                {decision.reasons.map((reason) => (
                  <li key={reason.label}>
                    <span className="font-semibold">{reason.label}.</span> {reason.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {visibleReviewFindings.length > 0 && (
            <div className="mt-4 rounded-lg border border-current/15 bg-white/45 p-3">
              <div className="text-xs font-semibold uppercase tracking-[0.14em]">Manual review required at</div>
              <ul className="mt-2 space-y-2 text-sm">
                {visibleReviewFindings.map((finding) => (
                  <li key={finding.id} className="flex gap-2">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${finding.severity === 'critical' ? 'bg-red-600' : finding.severity === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                    <div>
                      <a href={`#finding-${encodeURIComponent(finding.id)}`} className="font-semibold underline decoration-current/40 underline-offset-2 hover:decoration-current">
                        {finding.title}
                      </a>
                      <span className="ml-2 font-mono text-xs opacity-75">
                        {finding.filePath || 'SKILL.md'}{finding.lineNumber ? `:${finding.lineNumber}` : ''}
                      </span>
                      <p className="text-xs opacity-80">{finding.recommendation || finding.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {manualReviewFindings.length > visibleReviewFindings.length && (
                <p className="mt-3 text-xs opacity-75">Plus {manualReviewFindings.length - visibleReviewFindings.length} additional high-severity finding{manualReviewFindings.length - visibleReviewFindings.length === 1 ? '' : 's'} in the findings table.</p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs opacity-75">
            Static score: {result.overallScore}/100. The install decision prioritizes severity and install-surface evidence over this score.
          </p>
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
