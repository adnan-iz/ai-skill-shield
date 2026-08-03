"use client"

import { useMemo, useState, useSyncExternalStore } from 'react'
import {
  getValidation,
  getValidationHistorySnapshot,
  parseValidationHistory,
  saveValidation,
  subscribeValidationHistory,
} from '@/lib/state'
import { runFullValidation } from '@/lib/validator/orchestrator'
import type { SkillInput, ValidationResult } from '@/lib/validator/types'
import ScoreGauge from '@/components/report/score-gauge'
import FindingsTable from '@/components/report/findings-table'

type SourceMode = 'saved' | 'paste'

interface CompareSlotState {
  key: string
  mode: SourceMode
  input: string
  result: ValidationResult | null
  loading: boolean
  error: string
}

const initialSlots: CompareSlotState[] = [
  { key: 'a', mode: 'saved', input: '', result: null, loading: false, error: '' },
  { key: 'b', mode: 'saved', input: '', result: null, loading: false, error: '' },
]

const riskColor: Record<ValidationResult['riskLevel'], string> = {
  safe: 'text-shield-600',
  low: 'text-shield-600',
  medium: 'text-yellow-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
}

export default function ComparePage() {
  const [slots, setSlots] = useState<CompareSlotState[]>(initialSlots)
  const historySnapshot = useSyncExternalStore(
    subscribeValidationHistory,
    getValidationHistorySnapshot,
    () => '[]'
  )
  const savedReports = useMemo(() => parseValidationHistory(historySnapshot), [historySnapshot])

  const compared = slots.filter((slot) => slot.result).map((slot) => slot.result as ValidationResult)
  const axes = useMemo(() => {
    const keys = new Map<string, string>()
    for (const result of compared) {
      for (const axis of result.axes) keys.set(axis.key, axis.name)
    }
    return [...keys.entries()].map(([key, name]) => ({ key, name }))
  }, [compared])

  function updateSlot(index: number, update: Partial<CompareSlotState>) {
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...update } : slot))
  }

  async function analyze(index: number) {
    const slot = slots[index]
    const input = slot.input.trim()
    if (!input) return

    updateSlot(index, { loading: true, error: '' })
    try {
      let result: ValidationResult | null = null

      if (slot.mode === 'paste') {
        const skillInput: SkillInput = { files: [{ path: 'SKILL.md', content: input }] }
        result = await runFullValidation(skillInput)
      } else {
        result = getValidation(input)
        if (!result) {
          const response = await fetch(`/api/validate?id=${encodeURIComponent(input)}`)
          if (!response.ok) throw new Error('Report not found or expired')
          result = await response.json() as ValidationResult
          saveValidation(result)
        }
      }

      updateSlot(index, { result, loading: false })
    } catch (error) {
      updateSlot(index, {
        result: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Comparison failed',
      })
    }
  }

  function addThirdSlot() {
    setSlots((current) => current.length === 2
      ? [...current, { key: 'c', mode: 'saved', input: '', result: null, loading: false, error: '' }]
      : current
    )
  }

  function removeThirdSlot() {
    setSlots((current) => current.slice(0, 2))
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Compare</h1>
          <p className="mt-1 text-sm text-on-surface-secondary">
            Compare two or three saved reports, report IDs, or pasted SKILL.md files.
          </p>
        </div>
        {slots.length === 2 ? (
          <button onClick={addThirdSlot} className="rounded-xl border border-outline bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-secondary">
            Add third skill
          </button>
        ) : (
          <button onClick={removeThirdSlot} className="rounded-xl border border-outline bg-surface-container px-4 py-2 text-sm font-semibold text-on-surface hover:bg-surface-secondary">
            Remove third skill
          </button>
        )}
      </div>

      <div className={`mb-8 grid grid-cols-1 gap-5 ${slots.length === 3 ? 'xl:grid-cols-3' : 'lg:grid-cols-2'}`}>
        {slots.map((slot, index) => (
          <section key={slot.key} className="glass-card rounded-xl p-5" aria-labelledby={`compare-${slot.key}-title`}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 id={`compare-${slot.key}-title`} className="mr-auto text-sm font-semibold text-on-surface">Skill {index + 1}</h2>
              {(['saved', 'paste'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={slot.mode === mode}
                  onClick={() => updateSlot(index, { mode, input: '', result: null, error: '' })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    slot.mode === mode
                      ? 'bg-shield-100 text-shield-700'
                      : 'bg-surface-secondary text-on-surface-secondary hover:bg-outline'
                  }`}
                >
                  {mode === 'saved' ? 'Saved / ID' : 'Paste SKILL.md'}
                </button>
              ))}
            </div>

            {slot.mode === 'saved' ? (
              <>
                <label htmlFor={`compare-${slot.key}-id`} className="mb-2 block text-xs font-medium text-on-surface-secondary">
                  Search saved reports or enter a report ID
                </label>
                <input
                  id={`compare-${slot.key}-id`}
                  list={`compare-${slot.key}-reports`}
                  value={slot.input}
                  onChange={(event) => updateSlot(index, { input: event.target.value, error: '' })}
                  placeholder="Report ID"
                  className="w-full rounded-lg border border-outline bg-surface-container p-3 text-sm text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
                />
                <datalist id={`compare-${slot.key}-reports`}>
                  {savedReports.map((report) => (
                    <option key={report.id} value={report.id}>{report.skillName} · {report.overallScore}/100</option>
                  ))}
                </datalist>
              </>
            ) : (
              <>
                <label htmlFor={`compare-${slot.key}-content`} className="mb-2 block text-xs font-medium text-on-surface-secondary">SKILL.md content</label>
                <textarea
                  id={`compare-${slot.key}-content`}
                  value={slot.input}
                  onChange={(event) => updateSlot(index, { input: event.target.value, error: '' })}
                  placeholder="Paste SKILL.md content"
                  rows={9}
                  className="w-full rounded-lg border border-outline bg-surface-container p-3 font-mono text-sm text-on-surface placeholder-on-surface-secondary focus:border-shield-500 focus:outline-none focus:ring-1 focus:ring-shield-500"
                />
              </>
            )}

            {slot.error && <p role="alert" className="mt-2 text-xs text-error">{slot.error}</p>}
            <button
              type="button"
              onClick={() => void analyze(index)}
              disabled={!slot.input.trim() || slot.loading}
              className="mt-3 rounded-lg bg-shield-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-shield-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {slot.loading ? 'Loading…' : 'Add to comparison'}
            </button>
          </section>
        ))}
      </div>

      {compared.length > 0 ? (
        <>
          <section className="glass-card mb-8 overflow-hidden rounded-xl" aria-labelledby="comparison-summary">
            <div className="border-b border-outline p-4">
              <h2 id="comparison-summary" className="text-sm font-semibold uppercase tracking-wider text-on-surface-secondary">Comparison summary</h2>
              {compared.length < 2 && <p className="mt-1 text-xs text-on-surface-secondary">Add at least one more skill for a direct comparison.</p>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-outline text-left text-xs uppercase text-on-surface-secondary">
                    <th className="px-4 py-3">Metric</th>
                    {compared.map((result) => <th key={result.id} className="px-4 py-3">{result.skillName}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline">
                  <tr><th className="px-4 py-3 text-left font-medium">Static score</th>{compared.map((result) => <td key={result.id} className="px-4 py-3 text-lg font-bold">{result.overallScore}/100</td>)}</tr>
                  <tr><th className="px-4 py-3 text-left font-medium">Highest finding</th>{compared.map((result) => <td key={result.id} className={`px-4 py-3 font-semibold uppercase ${riskColor[result.riskLevel]}`}>{result.riskLevel}</td>)}</tr>
                  <tr><th className="px-4 py-3 text-left font-medium">Total findings</th>{compared.map((result) => <td key={result.id} className="px-4 py-3">{result.findings.length}</td>)}</tr>
                  {axes.map((axis) => (
                    <tr key={axis.key}>
                      <th className="px-4 py-3 text-left font-medium">{axis.name}</th>
                      {compared.map((result) => <td key={result.id} className="px-4 py-3">{result.axes.find((item) => item.key === axis.key)?.score ?? '—'}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className={`grid grid-cols-1 gap-6 ${compared.length === 3 ? 'xl:grid-cols-3' : 'lg:grid-cols-2'}`}>
            {compared.map((result) => (
              <section key={result.id} className="min-w-0" aria-labelledby={`result-${result.id}`}>
                <h2 id={`result-${result.id}`} className="mb-3 truncate text-sm font-semibold uppercase tracking-wider text-on-surface-secondary">{result.skillName}</h2>
                <div className="glass-card rounded-xl p-4"><ScoreGauge score={result.overallScore} riskLevel={result.riskLevel} /></div>
                <div className="glass-card mt-4 overflow-hidden rounded-xl"><FindingsTable findings={result.findings} /></div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="glass-card rounded-xl p-14 text-center">
          <span className="material-symbols-outlined mb-2 inline-block text-4xl text-on-surface-secondary/40">compare_arrows</span>
          <p className="text-sm text-on-surface-secondary">Choose saved reports or paste SKILL.md content to start comparing.</p>
        </div>
      )}
    </div>
  )
}
