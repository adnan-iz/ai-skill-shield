import type { PublicReviewSummary } from '@/lib/trust-server'

export default function ReviewStatus({ review }: { review: PublicReviewSummary | null }) {
  if (!review) return null
  const pending = review.status === 'awaiting_approval'
  return (
    <section className="glass-card mt-6 rounded-xl p-6" aria-labelledby="evidence-review-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-shield-600">Maintainer evidence reviewed</p>
          <h2 id="evidence-review-heading" className="mt-1 text-xl font-bold text-on-surface">
            {pending ? 'Pending human approval' : review.status === 'completed' ? 'Review decision applied' : review.status === 'failed' ? 'Evidence review unavailable' : 'Evidence review in progress'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-on-surface-secondary">Evidence was checked against the exact scanned commit. AI findings remain proposals until required changes receive human approval.</p>
        </div>
        <div className="rounded-lg border border-outline bg-surface-secondary/50 px-4 py-3 text-sm text-on-surface">
          {review.verifiedRescan ? <><p className="font-semibold">Verified rescan score: {review.verifiedRescan.score}/100</p><p className="mt-1 text-xs text-on-surface-secondary">Original score: {review.originalScore}/100</p></> : <p className="font-semibold">Score unchanged: {review.originalScore}/100</p>}
        </div>
      </div>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-outline p-4"><dt className="text-xs text-on-surface-secondary">Original risk:</dt><dd className="mt-1 font-bold capitalize text-on-surface">{review.originalRiskLevel}</dd></div>
        <div className="rounded-lg border border-outline p-4"><dt className="text-xs text-on-surface-secondary">Effective risk:</dt><dd className="mt-1 font-bold capitalize text-on-surface">{review.effectiveRiskLevel}</dd></div>
        {pending && review.proposedRiskLevel && <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4"><dt className="text-xs text-yellow-900">Proposed risk:</dt><dd className="mt-1 font-bold capitalize text-yellow-950">{review.proposedRiskLevel}</dd></div>}
      </dl>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-on-surface-secondary">
        <span>{review.challengedCount} challenged</span><span>{review.confirmedCount} confirmed</span>
        {review.suppressedCount > 0 && <span>{review.suppressedCount} findings suppressed after human approval</span>}
        {review.changedCount > 0 && <span>{review.changedCount} severities changed after human approval</span>}
        {review.unresolvedCount > 0 && <span>{review.unresolvedCount} findings have insufficient evidence</span>}
      </div>
      {review.decisions.length > 0 && <ul className="mt-5 divide-y divide-outline border-y border-outline">
        {review.decisions.map((decision) => <li key={decision.findingKey} className="py-4 text-sm">
          <div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-on-surface">{decision.decision.replaceAll('_', ' ')}</span><span className="rounded-full bg-surface-secondary px-2 py-0.5 text-xs text-on-surface-secondary">{decision.humanApproved ? 'Human approved' : decision.approvalStatus === 'pending' ? 'Approval pending' : 'No report change'}</span></div>
          <p className="mt-2 leading-6 text-on-surface-secondary">{decision.explanation}</p>
          {decision.evidence.map((evidence, index) => <p key={`${evidence.filePath}:${evidence.lineStart ?? 0}:${index}`} className="mt-1 break-all font-mono text-xs text-on-surface-secondary">{evidence.filePath}{evidence.lineStart ? `:${evidence.lineStart}${evidence.lineEnd && evidence.lineEnd !== evidence.lineStart ? `-${evidence.lineEnd}` : ''}` : ''}</p>)}
        </li>)}
      </ul>}
      <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-shield-700"><a href={review.commentUrl} target="_blank" rel="noopener noreferrer">View originating GitHub comment</a><a href={review.commitUrl} target="_blank" rel="noopener noreferrer">View exact scanned commit</a></div>
    </section>
  )
}
