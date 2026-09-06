"use client"

import type { TokenAnalysis, ValidationResult, Finding } from '@/lib/validator/types'

export interface TokenEconomicsCardProps {
  tokenAnalysis?: (TokenAnalysis & { cacheRecommendations?: string[] }) | null
  result?: ValidationResult | null
  recommendations?: string[]
  findings?: Finding[]
  className?: string
}

interface CacheTier {
  label: string
  badgeClass: string
  ringClass: string
  textClass: string
  bgClass: string
  description: string
}

function getCacheTier(score: number | undefined): CacheTier {
  if (score === undefined || score === null || isNaN(score)) {
    return {
      label: 'Score Unavailable',
      badgeClass: 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300',
      ringClass: 'text-slate-400 dark:text-slate-600',
      textClass: 'text-slate-500 dark:text-slate-400',
      bgClass: 'bg-slate-100 dark:bg-slate-800/60',
      description: 'KV-cache efficiency score is not available for this run.',
    }
  }

  if (score >= 80) {
    return {
      label: 'Cache Friendly',
      badgeClass: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300',
      ringClass: 'text-emerald-500 dark:text-emerald-400',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50/50 dark:bg-emerald-950/20',
      description: 'Static prompt prefix structure maximizes LLM KV-cache reuse.',
    }
  }

  if (score >= 60) {
    return {
      label: 'Moderate',
      badgeClass: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300',
      ringClass: 'text-amber-500 dark:text-amber-400',
      textClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50/50 dark:bg-amber-950/20',
      description: 'Some prompt churn or frontmatter weight reduces caching hit rate.',
    }
  }

  return {
    label: 'Needs Optimization',
    badgeClass: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/40 dark:text-rose-300',
    ringClass: 'text-rose-500 dark:text-rose-400',
    textClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-50/50 dark:bg-rose-950/20',
    description: 'Dynamic placeholders or large frontmatter frequently bust KV-caches.',
  }
}

function formatCost(cost: number | undefined): string {
  if (cost === undefined || cost === null || isNaN(cost)) return '—'
  if (cost < 0.0001) return '< $0.0001'
  return `$${cost.toFixed(4)}`
}

export default function TokenEconomicsCard({
  tokenAnalysis,
  result,
  recommendations: explicitRecommendations,
  findings: explicitFindings,
  className = '',
}: TokenEconomicsCardProps) {
  const analysis = tokenAnalysis ?? result?.tokenAnalysis ?? null
  const score = analysis?.cacheEfficiencyScore
  const tier = getCacheTier(score)

  // Collect recommendations from explicit props, tokenAnalysis, or findings
  const recList: string[] = []
  if (explicitRecommendations && explicitRecommendations.length > 0) {
    recList.push(...explicitRecommendations)
  } else if (analysis?.cacheRecommendations && analysis.cacheRecommendations.length > 0) {
    recList.push(...analysis.cacheRecommendations)
  }

  const allFindings = explicitFindings ?? result?.findings ?? []
  for (const finding of allFindings) {
    if (finding.category === 'token-cache-optimization' && finding.recommendation) {
      if (!recList.includes(finding.recommendation)) {
        recList.push(finding.recommendation)
      }
    }
  }

  const costClaude = analysis?.estimatedCostPer1kRuns?.claudeSonnet
  const costGpt4o = analysis?.estimatedCostPer1kRuns?.gpt4o
  const costGemini = analysis?.estimatedCostPer1kRuns?.geminiFlash

  // Gauge calculation
  const clampedScore = typeof score === 'number' ? Math.max(0, Math.min(100, Math.round(score))) : 0
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = typeof score === 'number' ? circumference - (clampedScore / 100) * circumference : circumference

  return (
    <div
      data-testid="token-economics-card"
      className={`glass-card rounded-xl border border-slate-200 bg-white/80 p-5 shadow-xs transition-colors dark:border-slate-800 dark:bg-slate-900/60 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            <span className="material-symbols-outlined text-lg text-emerald-500">token</span>
            Token Economics &amp; KV-Cache Friendliness
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Measures prompt caching efficiency and inference cost across frontier LLM engines.
          </p>
        </div>

        {analysis?.totalTokens !== undefined && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {analysis.totalTokens.toLocaleString()} tokens
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Score Gauge + Multi-model Costs */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-12">
        {/* KV Cache Score & Visual Gauge */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40 md:col-span-5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cache Efficiency Score
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-3xl font-bold tracking-tight ${tier.textClass}`}>
                  {typeof score === 'number' ? `${clampedScore}` : '—'}
                </span>
                {typeof score === 'number' && (
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ 100</span>
                )}
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative flex h-20 w-20 items-center justify-center">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80" aria-label="Cache efficiency gauge">
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  strokeWidth="7"
                  className="stroke-slate-200 fill-none dark:stroke-slate-800"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  strokeWidth="7"
                  strokeLinecap="round"
                  className={`fill-none transition-all duration-700 ${tier.ringClass}`}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  stroke="currentColor"
                />
              </svg>
              <span className={`absolute text-xs font-bold ${tier.textClass}`}>
                {typeof score === 'number' ? `${clampedScore}%` : 'N/A'}
              </span>
            </div>
          </div>

          <div className="mt-3">
            <span
              data-testid="cache-efficiency-badge"
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tier.badgeClass}`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {tier.label}
            </span>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{tier.description}</p>
          </div>
        </div>

        {/* Cost per 1k Runs */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-900/40 md:col-span-7">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Estimated Cost per 1,000 Runs
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">Uncached baseline</span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {/* Claude 3.5 Sonnet */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-800/70">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Claude 3.5 Sonnet</div>
              <div
                data-testid="cost-claude-sonnet"
                className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                {formatCost(costClaude)}
              </div>
              <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">$3.00 / 1M</div>
            </div>

            {/* GPT-4o */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-800/70">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">GPT-4o</div>
              <div
                data-testid="cost-gpt4o"
                className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                {formatCost(costGpt4o)}
              </div>
              <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">$2.50 / 1M</div>
            </div>

            {/* Gemini Flash */}
            <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700/60 dark:bg-slate-800/70">
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Gemini Flash</div>
              <div
                data-testid="cost-gemini-flash"
                className="mt-1 text-sm font-bold text-slate-900 dark:text-slate-100"
              >
                {formatCost(costGemini)}
              </div>
              <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">$0.075 / 1M</div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
            <span>Prompt caching can reduce repeat invocation costs by up to 90%.</span>
          </div>
        </div>
      </div>

      {/* Cache Recommendations (if any exist) */}
      {recList.length > 0 && (
        <div data-testid="cache-recommendations-section" className="mt-5 rounded-lg border border-amber-200/80 bg-amber-50/40 p-3.5 dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            <span className="material-symbols-outlined text-base">lightbulb</span>
            KV-Cache &amp; Prompt Layout Recommendations ({recList.length})
          </div>
          <ul data-testid="cache-recommendations-list" className="mt-2.5 space-y-2 text-xs text-amber-950 dark:text-amber-200">
            {recList.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-amber-500">•</span>
                <span className="flex-1 leading-relaxed">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
