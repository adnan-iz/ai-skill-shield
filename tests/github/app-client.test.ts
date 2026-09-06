import { generateKeyPairSync } from 'node:crypto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createGitHubAppJwt, getInstallationToken, githubPublicUrl, githubRequest } from '@/lib/github/app-client'

const privateKey = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey

const originalEnvironment = {
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
  publicUrl: process.env.NEXT_PUBLIC_APP_URL,
}

afterEach(() => {
  vi.restoreAllMocks()
  restoreEnvironment('GITHUB_APP_ID', originalEnvironment.appId)
  restoreEnvironment('GITHUB_APP_PRIVATE_KEY', originalEnvironment.privateKey)
  restoreEnvironment('NEXT_PUBLIC_APP_URL', originalEnvironment.publicUrl)
})

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}

function configureApp(): void {
  process.env.GITHUB_APP_ID = '123'
  process.env.GITHUB_APP_PRIVATE_KEY = privateKey
}

describe('GitHub App client', () => {
  it('creates a three-segment GitHub App JWT', () => {
    expect(createGitHubAppJwt('123', privateKey, 1_700_000_000).split('.')).toHaveLength(3)
  })

  it('uses the repository installation token and GitHub REST headers for requests', async () => {
    configureApp()
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(Response.json({ id: 42 }))
      .mockResolvedValueOnce(Response.json({ token: 'installation-token' }))
      .mockResolvedValueOnce(Response.json({ ok: true }))

    await githubRequest('acme', 'skills', '/repos/acme/skills/issues', { method: 'POST' })

    const request = new Request(fetchMock.mock.calls[2][0], fetchMock.mock.calls[2][1])
    expect(request.headers.get('x-github-api-version')).toBe('2022-11-28')
    expect(request.headers.get('authorization')).toBe('Bearer installation-token')
    expect(request.headers.get('user-agent')).toBe('ai-skill-shield-github-app')
  })

  it('returns no installation token when the app is not installed for a repository', async () => {
    configureApp()
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(null, { status: 404 }))

    await expect(getInstallationToken('acme', 'skills')).resolves.toBeNull()
  })

  it('normalizes the public application URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://shield.example/'

    expect(githubPublicUrl()).toBe('https://shield.example')
  })
})
