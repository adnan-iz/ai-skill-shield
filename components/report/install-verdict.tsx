"use client"

import { buildInstallDecision } from '@/lib/report/install-decision'
import type { ValidationResult } from '@/lib/validator/types'

interface InstallVerdictProps {
  result: ValidationResult
  approvalStatus: 'pending' | 'approved' | 'rejected' | null
}

const toneClasses = {
  safe: 'border-l-4 border-l-primary bg-primary/10 border-t border-r border-b border-outline-variant/60 shadow-[0_0_30px_-10px_rgba(75,226,119,0.25)]',
  warn: 'border-l-4 border-l-amber-400 bg-amber-500/10 border-t border-r border-b border-outline-variant/60 shadow-[0_0_30px_-10px_rgba(245,158,11,0.25)]',
  danger: 'border-l-4 border-l-error bg-error/15 border-t border-r border-b border-outline-variant/60 shadow-[0_0_30px_-10px_rgba(255,180,171,0.3)]',
}

const toneIcons = {
  safe: { icon: 'verified_user', textClass: 'text-primary', bgClass: 'bg-primary/20 border-primary/40' },
  warn: { icon: 'warning', textClass: 'text-amber-400', bgClass: 'bg-amber-500/20 border-amber-500/40' },
  danger: { icon: 'dangerous', textClass: 'text-error', bgClass: 'bg-error/20 border-error/40' },
}

const dotClasses = {
  pass: 'bg-primary shadow-[0_0_8px_rgba(75,226,119,0.8)]',
  warn: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]',
  fail: 'bg-error shadow-[0_0_8px_rgba(255,180,171,0.8)]',
  neutral: 'bg-slate-500',
}

export default function InstallVerdict({ result, approvalStatus }: InstallVerdictProps) {
  const decision = buildInstallDecision(result, approvalStatus)
  const metadata = result.source?.repositoryMeta
  const toneIcon = toneIcons[decision.tone]
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
    <div className={`rounded-xl p-6 backdrop-blur-xl transition-all ${toneClasses[decision.tone]}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-lg flex items-center justify-center border ${toneIcon.bgClass}`}>
              <span className={`material-symbols-outlined text-2xl ${toneIcon.textClass}`}>
                {toneIcon.icon}
              </span>
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-on-surface-secondary">
                PRIMARY INSTALL DECISION
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-on-surface">{decision.label}</h2>
            </div>
          </div>
          <p className="mt-3 text-sm text-on-surface-secondary leading-relaxed">{decision.summary}</p>
          {decision.reasons.length > 0 && (
            <div className="mt-4 rounded-lg border border-outline-variant/50 bg-surface-container-low/70 p-3.5">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-on-surface-secondary">
                DECISION JUSTIFICATION
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-on-surface">
                {decision.reasons.map((reason) => (
                  <li key={reason.label} className="flex items-start gap-1.5">
                    <span className="text-primary font-bold">&bull;</span>
                    <span>
                      <strong className="font-semibold text-on-surface">{reason.label}:</strong>{' '}
                      <span className="text-on-surface-secondary">{reason.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {visibleReviewFindings.length > 0 && (
            <div className="mt-4 rounded-lg border border-outline-variant/50 bg-surface-container-low/70 p-3.5">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-error">
                MANUAL REVIEW REQUIRED
              </div>
              <ul className="mt-2 space-y-2 text-xs">
                {visibleReviewFindings.map((finding) => (
                  <li key={finding.id} className="flex items-start gap-2">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${finding.severity === 'critical' ? 'bg-error' : finding.severity === 'high' ? 'bg-amber-400' : 'bg-yellow-400'}`} />
                    <div>
                      <a href={`#finding-${encodeURIComponent(finding.id)}`} className="font-semibold text-on-surface hover:text-primary transition-colors">
                        {finding.title}
                      </a>
                      <span className="ml-2 font-mono text-[11px] text-on-surface-secondary">
                        {finding.filePath || 'SKILL.md'}{finding.lineNumber ? `:${finding.lineNumber}` : ''}
                      </span>
                      <p className="text-[11px] text-on-surface-secondary/90 mt-0.5">{finding.recommendation || finding.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {manualReviewFindings.length > visibleReviewFindings.length && (
                <p className="mt-3 text-[11px] font-mono text-on-surface-secondary">
                  +{manualReviewFindings.length - visibleReviewFindings.length} additional high-severity finding{manualReviewFindings.length - visibleReviewFindings.length === 1 ? '' : 's'} in findings ledger.
                </p>
              )}
            </div>
          )}
          <p className="mt-3 text-xs font-mono text-on-surface-secondary/70">
            Static score: <strong className="text-on-surface font-semibold">{result.overallScore}/100</strong>. Decision engine prioritizes severity &amp; surface evidence over baseline numeric score.
          </p>
        </div>

        {metadata && (
          <div className="grid min-w-[280px] grid-cols-2 gap-2.5 text-sm">
            <Meta label="Stars" value={Intl.NumberFormat('en-US').format(metadata.stars)} />
            <Meta label="Forks" value={Intl.NumberFormat('en-US').format(metadata.forks)} />
            <Meta label="Issues" value={Intl.NumberFormat('en-US').format(metadata.openIssues)} />
            <Meta label="License" value={metadata.license || 'Unknown'} />
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
        {decision.checklist.map((item) => (
          <div key={item.label} className="rounded-lg border border-outline-variant/40 bg-surface-container-low/80 p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-on-surface">
              <span className={`h-2 w-2 rounded-full ${dotClasses[item.status]}`} />
              <span>{item.label}</span>
            </div>
            <p className="mt-1 text-[11px] text-on-surface-secondary leading-normal">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant/40 bg-surface-container-low/80 p-2.5">
      <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-on-surface-secondary">{label}</div>
      <div className="mt-0.5 text-sm font-semibold font-mono text-on-surface">{value}</div>
    </div>
  )
}
