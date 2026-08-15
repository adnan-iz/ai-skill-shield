import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { acceptsMarkdown } from '@/lib/markdown-negotiation'

export function proxy(request: NextRequest) {
  if (request.method === 'GET' && acceptsMarkdown(request.headers.get('accept'))) {
    const markdownUrl = new URL('/api/markdown', request.url)
    markdownUrl.searchParams.set('path', request.nextUrl.pathname)
    return NextResponse.rewrite(markdownUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.[^/]+$).*)'],
}
