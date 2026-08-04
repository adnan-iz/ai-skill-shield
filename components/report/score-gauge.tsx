"use client"

import { useEffect, useState } from 'react'

interface ScoreGaugeProps {
  score: number
  riskLevel: string
  compact?: boolean
}

export default function ScoreGauge({ score, riskLevel, compact = false }: ScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100)
    return () => clearTimeout(timer)
  }, [score])

  const color =
    score >= 70
      ? 'text-shield-600'
      : score >= 50
      ? 'text-yellow-600'
      : score >= 30
      ? 'text-orange-600'
      : 'text-red-600'

  const strokeColorVar = score >= 70 ? 'var(--color-shield-600)' : score >= 50 ? 'var(--color-threat-medium)' : score >= 30 ? 'var(--color-threat-high)' : 'var(--color-threat-critical)'
  const riskStrokeColorVar = riskLevel === 'critical' ? 'var(--color-threat-critical)' : riskLevel === 'high' ? 'var(--color-threat-high)' : riskLevel === 'medium' ? 'var(--color-threat-medium)' : 'var(--color-outline)'

  const size = compact ? 112 : 180
  const radius = compact ? 44 : 72
  const center = size / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  const riskLabel: Record<string, string> = {
    safe: 'None',
    low: 'Low severity',
    medium: 'Medium severity',
    high: 'High severity',
    critical: 'Critical severity',
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          style={compact ? { filter: `drop-shadow(0 0 10px ${strokeColorVar})` } : undefined}
        >
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={compact ? 9 : 10}
            style={{ stroke: compact ? riskStrokeColorVar : 'var(--color-outline)' }}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={compact ? 9 : 10}
            style={{ stroke: strokeColorVar }}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span
            className={`${compact ? 'text-3xl' : 'text-5xl'} font-bold ${color} transition-colors duration-500`}
            style={compact ? { textShadow: `0 0 16px ${strokeColorVar}` } : undefined}
          >
            {animatedScore}{compact && <span className="text-base">%</span>}
          </span>
          {!compact && <span className="text-xs font-medium text-on-surface-secondary">/ 100</span>}
          {compact && <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-secondary">Static score</span>}
        </div>
      </div>
      {compact ? (
        <div className="mt-2 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider">
          <span className="text-shield-600">{score}% score</span>
          <span className="text-on-surface-secondary">{100 - score}% score gap</span>
        </div>
      ) : (
        <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-on-surface-secondary">Static analysis score</span>
      )}
      <span className={`${compact ? 'text-xs' : 'text-sm'} mt-1 font-semibold text-on-surface`}>
        Highest finding: {riskLabel[riskLevel] || riskLevel}
      </span>
    </div>
  )
}
