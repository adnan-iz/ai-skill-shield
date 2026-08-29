import { createSign } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { ensureDatabase, getDatabase } from '@/lib/db'
import { githubScanNotifications } from '@/lib/db/schema'
import { githubBadgePath, githubTrustPath, trustTargetForResult } from '@/lib/trust'
import type { Finding, ValidationResult } from '@/lib/validator/types'

const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'ai-skill-shield-github-app'
const ISSUE_TITLE_PREFIX = 'AI Skill Shield scan report'

export type NotificationOutcome = 'disabled' | 'ineligible' | 'already-notified' | 'not-installed' | 'notified'

export interface NotificationOptions {
  /** A deliberate user action may notify a public repository through the bot account. */
  allowBotFallback?: boolean
}

interface GitHubAppConfig {
  appId: string
  privateKey: string
  publicUrl: string
}

interface Installation {
  id: number
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

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

function appConfig(): GitHubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID?.trim()
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (!appId || !privateKey || !publicUrl) return null
  return { appId, privateKey, publicUrl: publicUrl.replace(/\/$/, '') }
}

function notificationPublicUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://ai-skill-shield.suppeng.com').replace(/\/$/, '')
}

function botToken(): string | null {
  return process.env.GITHUB_BOT_TOKEN?.trim() || null
}

export function createGitHubAppJwt(appId: string, privateKey: string, now = Math.floor(Date.now() / 1000)): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  signer.end()
  return `${header}.${payload}.${signer.sign(privateKey).toString('base64url')}`
}

function headers(token: string): HeadersInit {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function githubFetch(path: string, token: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: { ...headers(token), ...init.headers },
    signal: AbortSignal.timeout(10_000),
  })
}

async function installationToken(owner: string, repo: string, config: GitHubAppConfig): Promise<string | null> {
  const appJwt = createGitHubAppJwt(config.appId, config.privateKey)
  const installationResponse = await githubFetch(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/installation`, appJwt)
  if (installationResponse.status === 404) return null
  if (!installationResponse.ok) throw new Error(`GitHub installation lookup failed (${installationResponse.status})`)
  const installation = await installationResponse.json() as Installation
  if (!Number.isInteger(installation.id)) throw new Error('GitHub installation lookup returned no installation id')

  const tokenResponse = await githubFetch(`/app/installations/${installation.id}/access_tokens`, appJwt, { method: 'POST' })
  if (!tokenResponse.ok) throw new Error(`GitHub installation token request failed (${tokenResponse.status})`)
  const token = await tokenResponse.json() as { token?: unknown }
  if (typeof token.token !== 'string' || !token.token) throw new Error('GitHub installation token response was invalid')
  return token.token
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
  const config = appConfig()
  const target = notificationTarget(result)
  const source = result.source
  const body = githubNotificationBody(result, notificationPublicUrl())
  if (!target || !source?.owner || !source.repo || !source.sha || !body) return 'ineligible'

  await ensureDatabase()
  const { db } = getDatabase()
  const current = await db.select().from(githubScanNotifications)
    .where(eq(githubScanNotifications.target, target)).limit(1)
  if (current[0]?.lastSha === source.sha) return 'already-notified'

  const installationTokenValue = config
    ? await installationToken(source.owner, source.repo, config)
    : null
  const token = installationTokenValue || (options.allowBotFallback ? botToken() : null)
  if (!token) return config ? 'not-installed' : 'disabled'

  const existing = current[0]
  const issueResponse = existing
    ? await githubFetch(`/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/issues/${existing.issueNumber}`, token, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `${ISSUE_TITLE_PREFIX}: ${result.skillName}`, body }),
      })
    : await githubFetch(`/repos/${encodeURIComponent(source.owner)}/${encodeURIComponent(source.repo)}/issues`, token, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: `${ISSUE_TITLE_PREFIX}: ${result.skillName}`, body }),
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
