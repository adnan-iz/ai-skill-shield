import { NextRequest } from 'next/server'
import { badRequest, serverError, tooManyRequests } from '@/lib/api-error'
import { checkRateLimit } from '@/lib/security/rate-limit'
import { addRateLimitHeaders } from '@/lib/security/rate-limit-headers'

const GITHUB_SEARCH_URL = 'https://api.github.com/search/repositories'
const MAX_RESULTS = 8

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function githubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'skillshield/1.0',
  }
  const token = process.env.GITHUB_TOKEN?.trim()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')?.trim() || ''
  if (query.length < 2) return badRequest('Enter at least 2 characters to search GitHub skills.')
  if (query.length > 100) return badRequest('Search query must be 100 characters or fewer.')

  const rateLimit = await checkRateLimit(`github-search:${clientIp(request)}`, { maxRequests: 30, windowMs: 60_000 })
  if (!rateLimit.allowed) return addRateLimitHeaders(tooManyRequests(rateLimit.resetAt), rateLimit)

  try {
    const params = new URLSearchParams({
      q: `"${query}" in:name,description`,
      per_page: String(MAX_RESULTS),
      sort: 'stars',
      order: 'desc',
    })
    const response = await fetch(`${GITHUB_SEARCH_URL}?${params}`, {
      headers: githubHeaders(),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        return addRateLimitHeaders(serverError('GitHub search is temporarily rate limited. Please try again shortly.'), rateLimit)
      }
      return addRateLimitHeaders(serverError('GitHub search is unavailable. Please try again.'), rateLimit)
    }

    const payload = await response.json() as {
      items?: Array<{
        full_name?: string
        owner?: { login?: string }
        name?: string
        html_url?: string
        description?: string | null
        stargazers_count?: number
        updated_at?: string
        default_branch?: string
      }>
    }
    const results = (payload.items || [])
      .filter((item) => item.owner?.login && item.name && item.html_url)
      .map((item) => ({
        owner: item.owner!.login!,
        repo: item.name!,
        fullName: item.full_name || `${item.owner!.login}/${item.name}`,
        url: item.html_url!,
        description: item.description || 'No repository description provided.',
        stars: item.stargazers_count || 0,
        updatedAt: item.updated_at || null,
        defaultBranch: item.default_branch || null,
      }))

    return addRateLimitHeaders(Response.json({ results }), rateLimit)
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', message: 'GitHub skill search failed', error: error instanceof Error ? error.message : String(error) }))
    return addRateLimitHeaders(serverError('GitHub search failed. Please try again.'), rateLimit)
  }
}
