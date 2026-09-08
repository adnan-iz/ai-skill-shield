"use client"

import { useMemo } from 'react'
import type { Finding, Severity, ValidationResult } from '@/lib/validator/types'

export interface McpToolsCardProps {
  findings?: Finding[]
  result?: ValidationResult | null
  className?: string
}

const severityBadges: Record<Severity, string> = {
  critical: 'border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300',
  high: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
  medium: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  low: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  info: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
}

export default function McpToolsCard({
  findings: explicitFindings,
  result,
  className = '',
}: McpToolsCardProps) {
  // Filter findings: category starts with 'mcp-' or equals 'capability-drift'
  const relevantFindings = useMemo(() => {
    const allFindings = explicitFindings ?? result?.findings ?? []
    return allFindings.filter(
      (f) => f.category.startsWith('mcp-') || f.category === 'capability-drift'
    )
  }, [explicitFindings, result?.findings])

  // Specific risk vectors
  const precedenceFindings = useMemo(() => {
    return relevantFindings.filter(
      (f) =>
        f.category === 'mcp-description-poisoning' ||
        /precedence|override|priority|poisoning|hijack/i.test(`${f.title} ${f.category}`)
    )
  }, [relevantFindings])

  const unconstrainedFindings = useMemo(() => {
    return relevantFindings.filter(
      (f) =>
        f.category === 'mcp-unconstrained-parameter' ||
        /unconstrained/i.test(`${f.title} ${f.category}`)
    )
  }, [relevantFindings])

  const driftFindings = useMemo(() => {
    return relevantFindings.filter(
      (f) => f.category === 'capability-drift' || f.ruleId?.startsWith('capability-drift')
    )
  }, [relevantFindings])

  const hasIssues = relevantFindings.length > 0
  const criticalCount = relevantFindings.filter((f) => f.severity === 'critical' || f.severity === 'high').length

  return (
    <div
      data-testid="mcp-tools-card"
      className={`glass-card rounded-xl border border-slate-200 bg-white/80 p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-lg text-indigo-500">extension</span>
            MCP Tool Schema Health &amp; Capability Drift
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Scans MCP tool declarations for precedence hijacking, unconstrained types, and undeclared runtime permissions.
          </p>
        </div>

        {/* Clean status badge or issue counter */}
        {hasIssues ? (
          <span
            data-testid="mcp-health-badge"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {relevantFindings.length} Issue{relevantFindings.length > 1 ? 's' : ''} Detected
          </span>
        ) : (
          <span
            data-testid="verified-clean-badge"
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <span className="material-symbols-outlined text-sm text-emerald-600 dark:text-emerald-400">verified</span>
            MCP Tools &amp; Permissions: Verified Clean
          </span>
        )}
      </div>

      {/* Threat Vector Badges */}
      <div className="mt-4 flex flex-wrap items-center gap-2" data-testid="mcp-badges-row">
        {/* Precedence Hijacking */}
        <div
          data-testid="badge-precedence-hijacking"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            precedenceFindings.length > 0
              ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              precedenceFindings.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
          <span>Precedence Hijacking:</span>
          <span className="font-semibold">
            {precedenceFindings.length > 0 ? `${precedenceFindings.length} Detected` : 'Clean'}
          </span>
        </div>

        {/* Unconstrained Parameters */}
        <div
          data-testid="badge-unconstrained-parameters"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            unconstrainedFindings.length > 0
              ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              unconstrainedFindings.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
          />
          <span>Unconstrained Parameters:</span>
          <span className="font-semibold">
            {unconstrainedFindings.length > 0 ? `${unconstrainedFindings.length} Detected` : 'Clean'}
          </span>
        </div>

        {/* Capability Mismatches */}
        <div
          data-testid="badge-capability-mismatches"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium ${
            driftFindings.length > 0
              ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300'
              : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              driftFindings.length > 0 ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          />
          <span>Capability Mismatches:</span>
          <span className="font-semibold">
            {driftFindings.length > 0 ? `${driftFindings.length} Detected` : 'Clean'}
          </span>
        </div>
      </div>

      {/* Clean state panel */}
      {!hasIssues && (
        <div
          data-testid="mcp-clean-panel"
          className="mt-4 rounded-lg border border-emerald-200/80 bg-emerald-50/40 p-4 text-xs text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200"
        >
          <div className="flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-base text-emerald-600 dark:text-emerald-400">
              check_circle
            </span>
            All MCP Tool Schemas &amp; Runtime Capabilities Verified Clean
          </div>
          <p className="mt-1 text-slate-600 dark:text-slate-300">
            No precedence hijacking directives, unconstrained dangerous parameter schemas, or undeclared network/filesystem/shell capabilities were found.
          </p>
        </div>
      )}

      {/* Findings Details List */}
      {hasIssues && (
        <div className="mt-5 space-y-3" data-testid="mcp-findings-list">
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Detected MCP &amp; Capability Drift Findings ({relevantFindings.length})</span>
            {criticalCount > 0 && (
              <span className="text-rose-600 dark:text-rose-400">
                {criticalCount} Critical/High Priority
              </span>
            )}
          </div>

          <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/50">
            {relevantFindings.map((finding) => (
              <div key={finding.id} className="p-3.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-850/50">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        severityBadges[finding.severity]
                      }`}
                    >
                      {finding.severity}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                      {finding.title}
                    </span>
                  </div>

                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    {finding.category}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  {finding.message}
                </p>

                {finding.snippet && (
                  <pre className="mt-2 max-h-24 overflow-x-auto rounded bg-slate-100 p-2 font-mono text-[11px] text-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    {finding.snippet}
                  </pre>
                )}

                {finding.recommendation && (
                  <div className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Fix:</span>
                    <span>{finding.recommendation}</span>
                  </div>
                )}

                {finding.filePath && (
                  <div className="mt-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
                    {finding.filePath}{finding.lineNumber ? `:${finding.lineNumber}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
