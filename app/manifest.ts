import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Skill Shield \u2014 Validate Agent Skills',
    short_name: 'AI Skill Shield',
    description: 'Pre-flight validation and security scanning for Agent Skills',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#059669',
    icons: [
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  }
}
