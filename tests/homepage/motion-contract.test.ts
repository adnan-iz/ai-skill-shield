import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()
const pageSource = readFileSync(join(root, 'app', 'page.tsx'), 'utf8')
const globalsSource = readFileSync(join(root, 'app', 'globals.css'), 'utf8')

describe('homepage motion contract', () => {
  test('keeps GitHub repo as the default homepage tab', () => {
    expect(pageSource).toContain("useState<Tab>('url')")
    expect(pageSource).toContain("['url', 'GitHub Repo']")
  })

  test('automatically starts scans linked from trust reports', () => {
    expect(pageSource).toContain("new URLSearchParams(window.location.search).get('url')")
    expect(pageSource).toContain('void handleUrlParse(target, true)')
    expect(pageSource).toContain('rescanStarted.current = true')
  })

  test('exposes cinematic-lift motion hooks in homepage markup', () => {
    expect(pageSource).toContain('home-hero-shell')
    expect(pageSource).toContain('home-hero-badge')
    expect(pageSource).toContain('home-hero-title')
    expect(pageSource).toContain('home-hero-copy')
    expect(pageSource).toContain('home-hero-shell py-16')
    expect(pageSource).toContain('mx-auto max-w-6xl px-4')
    expect(pageSource).toContain('home-stat-grid')
    expect(pageSource).toContain('home-stat-card home-stat-card-1')
    expect(pageSource).toContain('home-stat-card home-stat-card-2')
    expect(pageSource).toContain('home-stat-card home-stat-card-3')
  })

  test('keeps SEO-critical hero text visible while retaining ambient motion', () => {
    expect(globalsSource).not.toContain('@keyframes homeHeroTitleIn')
    expect(globalsSource).not.toContain('@keyframes homeHeroCopyIn')
    expect(globalsSource).toContain('@keyframes homeHeroGlowDrift')
    expect(globalsSource).toContain('@keyframes homeScanBeamSweep')
    expect(globalsSource).toContain('.home-hero-shell::before')
    expect(globalsSource).toContain('@media (prefers-reduced-motion: reduce)')
  })
})
