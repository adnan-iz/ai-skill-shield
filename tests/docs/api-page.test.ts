import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, test } from 'vitest'

const root = process.cwd()
const pageSource = readFileSync(join(root, 'app', 'docs', 'api', 'page.tsx'), 'utf8')
const navSource = readFileSync(join(root, 'components', 'layout', 'nav.tsx'), 'utf8')

describe('API documentation page', () => {
  test('renders the existing reference and links navigation to the human-readable page', () => {
    expect(pageSource).toContain("join(process.cwd(), 'docs', 'api.md')")
    expect(pageSource).toContain('marked.parse(markdown)')
    expect(pageSource).toContain('href="/api/docs"')
    expect(navSource).toContain('href: "/docs/api"')
    expect(navSource).toContain('href="/docs/api"')
  })
})
