import { createSign } from 'node:crypto'

const GITHUB_API = 'https://api.github.com'
const USER_AGENT = 'ai-skill-shield-github-app'
const REQUEST_TIMEOUT_MS = 10_000

interface GitHubAppConfig {
  appId: string
  privateKey: string
}

interface Installation {
  id: number
}

export class GitHubAppNotInstalledError extends Error {
  constructor(owner: string, repo: string) {
    super(`The AI Skill Shield GitHub App is not installed for ${owner}/${repo}`)
    this.name = 'GitHubAppNotInstalledError'
  }
}

function base64Url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

function appConfig(): GitHubAppConfig | null {
  const appId = process.env.GITHUB_APP_ID?.trim()
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (!appId || !privateKey) return null
  return { appId, privateKey }
}

export function hasGitHubAppCredentials(): boolean {
  return appConfig() !== null
}

export function githubPublicUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://ai-skill-shield.suppeng.com').replace(/\/$/, '')
}

export function createGitHubAppJwt(appId: string, privateKey: string, now = Math.floor(Date.now() / 1000)): string {
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64Url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${payload}`)
  signer.end()
  return `${header}.${payload}.${signer.sign(privateKey).toString('base64url')}`
}

export function githubHeaders(token: string): HeadersInit {
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
    headers: { ...githubHeaders(token), ...init.headers },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
}

export async function getInstallationToken(owner: string, repo: string): Promise<string | null> {
  const config = appConfig()
  if (!config) return null

  const appJwt = createGitHubAppJwt(config.appId, config.privateKey)
  const encodedOwner = encodeURIComponent(owner)
  const encodedRepo = encodeURIComponent(repo)
  const installationResponse = await githubFetch(`/repos/${encodedOwner}/${encodedRepo}/installation`, appJwt)
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

export async function githubRequest(
  owner: string,
  repo: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = await getInstallationToken(owner, repo)
  if (!token) throw new GitHubAppNotInstalledError(owner, repo)
  return githubFetch(path, token, init)
}

/** Personal-token API access for deployments that prefer polling over App webhooks. */
export async function githubTokenRequest(path: string, init: RequestInit = {}): Promise<Response> {
  const token = process.env.GITHUB_TOKEN?.trim()
  if (!token) throw new Error('GITHUB_TOKEN is not configured')
  return githubFetch(path, token, init)
}
