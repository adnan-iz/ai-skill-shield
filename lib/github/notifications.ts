import { eq } from 'drizzle-orm'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { githubScanNotifications } from '@/lib/db/schema'
import { createGitHubAppJwt, getInstallationToken, githubHeaders, githubPublicUrl, hasGitHubAppCredentials } from '@/lib/github/app-client'
import { githubBadgePath, githubTrustPath, trustTargetForResult } from '@/lib/trust'
import type { Finding, ValidationResult } from '@/lib/validator/types'

const ISSUE_TITLE_PREFIX = 'AI Skill Shield scan report'

export { createGitHubAppJwt } from '@/lib/github/app-client'

export type NotificationOutcome = 'disabled' | 'ineligible' | 'already-notified' | 'not-installed' | 'notified'

export interface NotificationOptions {
  /** A deliberate user action may notify a public repository through the bot account. */
  allowBotFallback?: boolean
}

interface Issue {
  number: number
}

const severityOrder: Record<Finding['severity'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
}

function botToken(): string | null {
  return process.env.GITHUB_BOT_TOKEN?.trim() || null
}

export function githubNotificationBody(result: ValidationResult, publicUrl: string): string | null {
  const target = trustTargetForResult(result)
  if (!target || !result.source?.sha) return null
  const reportUrl = new URL(githubTrustPath(target), `${publicUrl}/`).toString()
  const badgeUrl = new URL(githubBadgePath(target), `${publicUrl}/`).toString()
  const logoUrl = new URL('/skill-shield-logo.svg', `${publicUrl}/`).toString()
  const badgeMarkdown = `[![AI Skill Shield](${badgeUrl})](${reportUrl})`
  const status = result.riskLevel === 'safe' || result.riskLevel === 'low' ? '✅ Ready to review' : '⚠️ Review recommended'
  const findings = formatFindings(result.findings)
  const scannedOn = new Date(result.timestamp).toISOString().slice(0, 10)

  return `<!-- ai-skill-shield:${target.owner.toLowerCase()}/${target.repo.toLowerCase()}/${target.path.toLowerCase()} -->
<p align="center">
  <a href="${publicUrl}">
    <img src="${logoUrl}" alt="AI Skill Shield" width="180" />
  </a>
</p>

## AI Skill Shield scan updated

[![AI Skill Shield](${badgeUrl})](${reportUrl})

| Field | Result |
| --- | --- |
| Commit | \`${result.source.sha.slice(0, 12)}\` |
| Score | **${result.overallScore}/100** |
| Status | ${status} |
| Findings | ${result.summary.criticalCount} critical · ${result.summary.highCount} high · ${result.summary.mediumCount} medium · ${result.summary.lowCount} low |
| Scanned | ${scannedOn} |

[View the full AI Skill Shield report](${reportUrl})

<details>
<summary><strong>Findings summary</strong></summary>

${findings}
</details>

<details>
<summary><strong>Add this status badge to the README</strong></summary>

[![AI Skill Shield](${badgeUrl})](${reportUrl})

Copy this Markdown into the README:

\`\`\`md
${badgeMarkdown}
\`\`\`

</details>

---

_This issue is maintained automatically after new default-branch scans. Automated scan results are evidence for review, not a guarantee of safety._`
}

function escapeMarkdown(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function formatFindings(findings: Finding[]): string {
  if (findings.length === 0) return 'No findings were raised in this scan.\n'

  const displayed = [...findings]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])
    .slice(0, 12)
    .map((finding) => {
      const location = finding.filePath
        ? `\`${escapeMarkdown(finding.filePath)}${finding.lineNumber ? `:${finding.lineNumber}` : ''}\``
        : null
      const recommendation = finding.recommendation
        ? `\n\n**Recommendation:** ${escapeMarkdown(finding.recommendation)}`
        : ''
      return `### ${finding.severity[0].toUpperCase()}${finding.severity.slice(1)} — ${escapeMarkdown(finding.title)}\n\n${location ? `**Location:** ${location}\n\n` : ''}${escapeMarkdown(finding.message)}${recommendation}`
    })

  if (findings.length > displayed.length) {
    displayed.push(`_Showing the ${displayed.length} highest-priority findings. View the full report for ${findings.length - displayed.length} more._`)
  }

  return displayed.join('\n\n') + '\n'
}

function notificationTarget(result: ValidationResult): string | null {
  const target = trustTargetForResult(result)
  return target ? `${target.owner.toLowerCase()}/${target.repo.toLowerCase()}/${target.path.toLowerCase()}` : null
}

/**
 * Automatic notifications require a repository-installed GitHub App. A public
 * repository may also be notified through the bot token after a deliberate user action.
 */
export async function notifyGitHubRepositoryOwner(
  result: ValidationResult,
  options: NotificationOptions = {}
): Promise<NotificationOutcome> {
  const appConfigured = hasGitHubAppCredentials()
  const target = notificationTarget(result)
  const source = result.source
  const body = githubNotificationBody(result, githubPublicUrl())
  if (!target || !source?.owner || !source.repo || !source.sha || !body) return 'ineligible'

  await ensureDatabase()
  const { db } = getDatabase()
  const current = await db.select().from(githubScanNotifications)
    .where(eq(githubScanNotifications.target, target)).limit(1)
  if (current[0]?.lastSha === source.sha) return 'already-notified'

  let installationTokenValue: string | null = null
  if (appConfigured) {
    try {
      installationTokenValue = await getInstallationToken(source.owner, source.repo)
    } catch (error) {
      if (!options.allowBotFallback) throw error
      console.warn(JSON.stringify({
        level: 'warn',
        message: 'GitHub App authentication failed; using the user-approved bot fallback',
        owner: source.owner,
        repo: source.repo,
        error: error instanceof Error ? error.message : String(error),
      }))
    }
  }
  const personalToken = process.env.GITHUB_TOKEN?.trim() || null
  const token = installationTokenValue || (options.allowBotFallback ? botToken() : null) || (!appConfigured ? personalToken : null)
  if (!token) return appConfigured ? 'not-installed' : 'disabled'

  const existing = current[0]
  const issueResponse = existing
    ? await fetch(`https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/issues/${existing.issueNumber}`, {
        method: 'PATCH', body: JSON.stringify({ title: `${ISSUE_TITLE_PREFIX}: ${result.skillName}`, body }),
        headers: { ...githubHeaders(token), 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10_000),
      })
    : await fetch(`https://api.github.com/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/issues`, {
        method: 'POST', body: JSON.stringify({ title: `${ISSUE_TITLE_PREFIX}: ${result.skillName}`, body }),
        headers: { ...githubHeaders(token), 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10_000),
      })
  if (!issueResponse.ok) throw new Error(`GitHub issue ${existing ? 'update' : 'creation'} failed (${issueResponse.status})`)
  const issue = await issueResponse.json() as Issue
  if (!Number.isInteger(issue.number)) throw new Error('GitHub issue response was invalid')

  await db.insert(githubScanNotifications).values({
    target, owner: source.owner, repo: source.repo, path: source.path || '', issueNumber: issue.number,
    lastSha: source.sha, lastScanId: result.id, lastNotifiedAt: Date.now(),
  }).onConflictDoUpdate({
    target: githubScanNotifications.target,
    set: { issueNumber: issue.number, lastSha: source.sha, lastScanId: result.id, lastNotifiedAt: Date.now() },
  })
  return 'notified'
}
