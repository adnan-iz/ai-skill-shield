"use client"

import { useEffect, useState } from 'react'

type Feedback = 'safe' | 'unsafe'

function ThumbIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {direction === 'up' ? (
        <path d="M7 10v10H4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h3Zm0 10h8.8a2 2 0 0 0 1.9-1.4l2.1-6.2A2 2 0 0 0 17.9 10H14l.7-4.2A2.4 2.4 0 0 0 12.3 3L7 10v10Z" />
      ) : (
        <path d="M7 14V4H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h3Zm0-10h8.8a2 2 0 0 1 1.9 1.4l2.1 6.2A2 2 0 0 1 17.9 14H14l.7 4.2a2.4 2.4 0 0 1-2.4 2.8L7 14V4Z" />
      )}
    </svg>
  )
}

export default function SafetyFeedback({ scanId }: { scanId: string }) {
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [votes, setVotes] = useState({ safe: 0, unsafe: 0 })

  useEffect(() => {
    let cancelled = false
    fetch(`/api/events?scanId=${encodeURIComponent(scanId)}`)
      .then((response) => response.ok ? response.json() as Promise<{ safe?: number; unsafe?: number }> : null)
      .then((data) => {
        if (!cancelled && data) setVotes({ safe: data.safe || 0, unsafe: data.unsafe || 0 })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [scanId])

  function submitFeedback(value: Feedback) {
    if (feedback) return
    setFeedback(value)
    setVotes((current) => ({ ...current, [value]: current[value] + 1 }))
    void fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: value === 'safe' ? 'trust.feedback.safe' : 'trust.feedback.unsafe', scanId }),
      keepalive: true,
    }).catch(() => {})
  }

  return (
    <div className="flex flex-col gap-3 border-t border-outline pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-on-surface">Do you consider this skill safe to use?</p>
        <p className="mt-1 text-xs text-on-surface-secondary">Community signals help prioritize human review; they do not change the scan verdict.</p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Skill safety feedback">
        <button
          type="button"
          onClick={() => submitFeedback('safe')}
          aria-pressed={feedback === 'safe'}
          disabled={feedback !== null}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-default ${feedback === 'safe' ? 'border-shield-500 bg-shield-50 text-shield-800' : 'border-outline bg-surface-container text-on-surface hover:bg-shield-50 hover:text-shield-800 disabled:opacity-60'}`}
        >
          <ThumbIcon direction="up" />
          Safe <span className="text-xs opacity-75">{votes.safe}</span>
        </button>
        <button
          type="button"
          onClick={() => submitFeedback('unsafe')}
          aria-pressed={feedback === 'unsafe'}
          disabled={feedback !== null}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-default ${feedback === 'unsafe' ? 'border-red-500 bg-red-500/10 text-red-600' : 'border-outline bg-surface-container text-on-surface hover:bg-red-500/10 hover:text-red-600 disabled:opacity-60'}`}
        >
          <ThumbIcon direction="down" />
          Unsafe <span className="text-xs opacity-75">{votes.unsafe}</span>
        </button>
      </div>
    </div>
  )
}
