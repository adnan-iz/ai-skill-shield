import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

const disallow = ['/api/', '/history', '/validate/']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      {
        userAgent: [
          'OAI-SearchBot',
          'ChatGPT-User',
          'GPTBot',
          'Claude-SearchBot',
          'Claude-User',
          'ClaudeBot',
          'PerplexityBot',
          'Perplexity-User',
        ],
        allow: '/',
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
