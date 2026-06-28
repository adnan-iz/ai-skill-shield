import { NextResponse } from 'next/server'

export interface RateLimitInfo {
  allowed: boolean
  limit?: number
  remaining: number
  resetAt: number
}

export function addRateLimitHeaders(response: NextResponse | Response, info: RateLimitInfo): Response {
  const headers = new Headers(response.headers)
  headers.set('X-RateLimit-Limit', String(info.limit ?? 60))
  headers.set('X-RateLimit-Remaining', String(info.remaining))
  headers.set('X-RateLimit-Reset', String(Math.ceil(info.resetAt / 1000)))

  if (!info.allowed) {
    headers.set('Retry-After', String(Math.ceil((info.resetAt - Date.now()) / 1000)))
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
