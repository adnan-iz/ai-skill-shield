"use client"

import { useState } from 'react'
import type { Finding, ValidationResult } from '@/lib/validator/types'
import FindingsTable from './findings-table'

interface AdditionalResult {
  status: 'complete' | 'partial' | 'unavailable'
  reason?: string
  findings?: Finding[]
  riskScore?: number
  filesReviewed?: number
  totalFiles?: number
}

export default function AdditionalChecks({ result }: { result: ValidationResult }) {
  const [consent, setConsent] = useState(false)
  const [transitive, setTransitive] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [checks, setChecks] = useState<Record<string, AdditionalResult>>({})

  async function run(kind: 'deep-scan' | 'ai-discovery') {
    setBusy(kind)
    try {
      const response = await fetch(`/api/${kind}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kind === 'deep-scan' ? { scanId: result.id, transitive } : { scanId: result.id, consent }),
      })
      const data = await response.json()
      setChecks(previous => ({ ...previous, [kind]: response.ok ? data : { status: 'unavailable', reason: data.message || data.error || 'Check unavailable' } }))
    } catch {
      setChecks(previous => ({ ...previous, [kind]: { status: 'unavailable', reason: 'Could not connect. Try again.' } }))
    } finally { setBusy(null) }
  }

  function download(kind: string, check: AdditionalResult) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(check, null, 2)], { type: 'application/json' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${kind}-${result.id}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const buttonClass = 'rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary'
  return (
    <section className="glass-card rounded-xl p-6 space-y-4" aria-labelledby="additional-checks-title">
      <h3 id="additional-checks-title" className="font-semibold text-on-surface">Additional security checks</h3>
      <p className="text-sm text-on-surface-secondary">These checks keep separate evidence and leave the original report intact. Review their findings before installing.</p>
      <div className="space-y-2">
        <p className="text-sm text-on-surface-secondary">Deep scanning checks code behavior, malware signatures, and embedded content when configured.</p>
        <label className="flex gap-2 text-sm text-on-surface-secondary"><input type="checkbox" checked={transitive} onChange={event => setTransitive(event.target.checked)} />Also inspect linked sources allowed by this server.</label>
        <button className={buttonClass} disabled={!!busy} onClick={() => void run('deep-scan')}>{busy === 'deep-scan' ? 'Scanning…' : 'Run deep security scan'}</button>
      </div>
      <div className="space-y-2">
        <label className="flex gap-2 text-sm text-on-surface-secondary"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} />Allow source content to be sent to the configured AI provider to find new threats. Detected secrets are redacted, but sensitive content may remain.</label>
        <button className={buttonClass} disabled={!!busy || !consent} onClick={() => void run('ai-discovery')}>{busy === 'ai-discovery' ? 'Reviewing…' : 'Find new threats with AI'}</button>
      </div>
      <div aria-live="polite" className="space-y-4">
        {Object.entries(checks).map(([kind, check]) => (
          <div key={kind} className="space-y-3 border-t border-outline-variant pt-4">
            <p className="text-sm text-on-surface">{kind === 'deep-scan' ? 'Deep security scan' : 'AI discovery'}: {check.status}{check.riskScore !== undefined ? `; risk ${check.riskScore}/100 (higher means more risk)` : ''}</p>
            {check.reason && <p className="text-sm text-on-surface-secondary">{check.reason}</p>}
            {check.filesReviewed !== undefined && <p className="text-xs text-on-surface-secondary">Reviewed {check.filesReviewed}/{check.totalFiles} files.</p>}
            {check.findings?.some(finding => finding.severity === 'critical' || finding.severity === 'high') && <p className="text-sm text-error">Additional checks found serious risks. Hold installation until these findings are reviewed.</p>}
            {check.findings && <FindingsTable findings={check.findings} />}
            <button className={buttonClass} onClick={() => download(kind, check)}>Download this check’s evidence</button>
          </div>
        ))}
      </div>
    </section>
  )
}
