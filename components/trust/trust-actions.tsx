"use client"

import Link from 'next/link'
import { useEffect, useState } from 'react'

interface TrustActionsProps {
  badgePath: string
  repoLabel: string
  scanId: string
  trustPath: string
}

type TrackedEvent = 'trust.view' | 'trust.share' | 'trust.badge_copy' | 'trust.cta'

function track(event: TrackedEvent, scanId: string) {
  void fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, scanId }),
    keepalive: true,
  }).catch(() => {})
}

export default function TrustActions({ badgePath, repoLabel, scanId, trustPath }: TrustActionsProps) {
  const [copied, setCopied] = useState<'link' | 'badge' | null>(null)

  useEffect(() => {
    track('trust.view', scanId)
  }, [scanId])

  async function shareReport() {
    const url = `${window.location.origin}${trustPath}`
    try {
      if (navigator.share) {
        await navigator.share({ title: `AI Skill Shield trust report for ${repoLabel}`, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied('link')
      }
      track('trust.share', scanId)
    } catch {
      // Dismissing the native share sheet needs no error UI.
    }
  }

  async function copyBadge() {
    const origin = window.location.origin
    const markdown = `[![AI Skill Shield](${origin}${badgePath})](${origin}${trustPath})`
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied('badge')
      track('trust.badge_copy', scanId)
    } catch {
      // Clipboard access can be blocked by browser policy.
    }
  }

  const buttonClass = 'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors'

  return (
    <div className="glass-card rounded-xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-on-surface">Share this trust result</p>
          <p className="mt-1 text-xs text-on-surface-secondary">
            The badge stays linked to the latest default-branch scan for this skill path.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={shareReport}
            className={`${buttonClass} border border-outline bg-surface-container text-on-surface hover:bg-surface-secondary`}
          >
            <span className="material-symbols-outlined text-lg">share</span>
            {copied === 'link' ? 'Link copied' : 'Share report'}
          </button>
          <button
            type="button"
            onClick={copyBadge}
            className={`${buttonClass} border border-outline bg-surface-container text-on-surface hover:bg-surface-secondary`}
          >
            <span className="material-symbols-outlined text-lg">verified</span>
            {copied === 'badge' ? 'Badge copied' : 'Copy README badge'}
          </button>
          <Link
            href={`/?ref=trust-report&refScan=${encodeURIComponent(scanId)}`}
            onClick={() => track('trust.cta', scanId)}
            className={`${buttonClass} bg-shield-600 text-white hover:bg-shield-700`}
          >
            Scan your skill
          </Link>
        </div>
      </div>
    </div>
  )
}
