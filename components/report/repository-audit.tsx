import type { RepositoryAudit } from '@/lib/github/repository-audit'

interface RepositoryAuditProps {
  audit: RepositoryAudit
}

const riskTone: Record<RepositoryAudit['riskLevel'], string> = {
  safe: 'bg-shield-100 text-shield-800',
  low: 'bg-threat-low/10 text-threat-low',
  medium: 'bg-threat-medium/10 text-threat-medium',
  high: 'bg-threat-high/10 text-threat-high',
  critical: 'bg-threat-critical/10 text-threat-critical',
}

export default function RepositoryAuditCard({ audit }: RepositoryAuditProps) {
  const highlightedFindings = audit.findings.filter((finding) => finding.snippet).slice(0, 4)

  return (
    <div className="glass-card rounded-xl p-4">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-on-surface-secondary">
            <span className="material-symbols-outlined text-lg">travel_explore</span>
            GitHub Repository Audit
          </h3>
          <p className="mt-1 text-sm text-on-surface">
            {audit.owner}/{audit.repo} on <span className="font-medium">{audit.branch}</span>
            {audit.sha ? ` @ ${audit.sha.slice(0, 7)}` : ''}
          </p>
          <p className="mt-1 text-xs text-on-surface-secondary">
            Repo-level install and execution review before trusting the imported skill.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${riskTone[audit.riskLevel]}`}>
          {audit.riskLevel} risk
        </span>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Metric label="Install Surfaces" value={audit.summary.installSurfaceCount} />
        <Metric label="Install Scripts" value={audit.summary.installScriptCount} />
        <Metric label="Workflows" value={audit.summary.workflowCount} />
        <Metric label="Package Files" value={audit.summary.packageManifestCount} />
        <Metric label="Repo Files" value={audit.summary.totalFiles} />
      </div>

      {audit.surfaces.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">
            Install Surface Map
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {audit.surfaces.slice(0, 8).map((surface) => (
              <div key={surface.path} className="rounded-lg border border-outline bg-surface-secondary/30 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-xs text-on-surface">{surface.path}</span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold uppercase text-on-surface-secondary">
                    {surface.kind.replace('-', ' ')}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-on-surface-secondary">
                  {surface.automatic ? 'Executes or influences install automatically' : 'Manual execution surface'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {highlightedFindings.length > 0 && (
        <div className="mb-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">
            Dangerous Lines
          </div>
          <div className="space-y-2">
            {highlightedFindings.map((finding) => (
              <div key={finding.id} className="rounded-lg border border-outline bg-surface-secondary/30 p-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-secondary">
                  <span className="font-semibold text-on-surface">{finding.title}</span>
                  {finding.filePath ? <span>{finding.filePath}{finding.lineNumber ? `:${finding.lineNumber}` : ''}</span> : null}
                </div>
                <pre className="mt-2 overflow-x-auto rounded bg-surface px-3 py-2 text-xs text-on-surface">
                  {finding.snippet}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      {audit.summary.truncated && (
        <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-100">
          Audit coverage was truncated to stay within fetch limits. Review the repository manually before installation.
        </div>
      )}

      {audit.findings.length === 0 ? (
        <div className="rounded-lg border border-outline bg-surface-secondary/40 px-4 py-3 text-sm text-on-surface-secondary">
          No repository-level install risks were detected in the audited execution surfaces.
        </div>
      ) : (
        <div className="space-y-3">
          {audit.findings.map((finding) => (
            <div key={finding.id} className="rounded-lg border border-outline bg-surface-secondary/30 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-on-surface">{finding.title}</div>
                  <div className="mt-1 text-xs text-on-surface-secondary">
                    {finding.category}
                    {finding.filePath ? ` - ${finding.filePath}` : ''}
                    {finding.lineNumber ? `:${finding.lineNumber}` : ''}
                  </div>
                </div>
                <span className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${riskTone[finding.severity === 'info' ? 'low' : finding.severity]}`}>
                  {finding.severity}
                </span>
              </div>
              <p className="mt-3 text-sm text-on-surface-secondary">{finding.message}</p>
              {finding.snippet && (
                <pre className="mt-3 overflow-x-auto rounded bg-surface px-3 py-2 text-xs text-on-surface">
                  {finding.snippet}
                </pre>
              )}
              {finding.recommendation && (
                <p className="mt-2 text-xs text-on-surface-secondary">
                  Recommendation: {finding.recommendation}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-outline bg-surface-secondary/40 p-3">
      <div className="text-lg font-semibold text-on-surface">{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-on-surface-secondary">{label}</div>
    </div>
  )
}
