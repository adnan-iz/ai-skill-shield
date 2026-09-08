const FETCH_TIMEOUT = 15_000
const GITHUB_USER_AGENT = 'skillshield/1.0'

export function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'User-Agent': GITHUB_USER_AGENT,
    Accept: 'application/vnd.github+json',
  }

  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

export async function fetchWithTimeout(
  path: string,
  options: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT,
  host: 'api' | 'raw' = 'api'
): Promise<Response> {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error('Unsupported GitHub request URL')
  }
  const allowedUrl = host === 'api'
    ? `https://api.github.com${path}`
    : `https://raw.githubusercontent.com${path}`

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetch(allowedUrl, {
        ...options,
        signal: controller.signal,
        headers: {
          ...githubHeaders(),
          ...(options.headers || {}),
        },
      })
      const body = response.status === 204 || response.status === 304
        ? null
        : await response.arrayBuffer()
      const headers = new Headers(response.headers)
      headers.delete('content-encoding')
      headers.delete('content-length')
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    } catch (error) {
      if (attempt === 1) throw error
    } finally {
      clearTimeout(timer)
    }
  }

  throw new Error('GitHub request failed')
}

export function githubAuthError(response: Response): string | null {
  const tokenConfigured = Boolean(process.env.GITHUB_TOKEN?.trim())

  if (response.status === 401) {
    return 'GitHub rejected GITHUB_TOKEN. Replace it in Vercel and redeploy.'
  }
  if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) {
    return tokenConfigured
      ? 'GitHub API limit reached for the configured GITHUB_TOKEN. Wait for the quota reset or use another token.'
      : 'GitHub API limit reached. Configure GITHUB_TOKEN in Vercel and redeploy.'
  }
  if (response.status === 403) {
    return 'GitHub denied access. Check that GITHUB_TOKEN can read public repositories, then redeploy.'
  }

  return null
}
