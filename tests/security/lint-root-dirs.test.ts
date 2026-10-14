import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'

const require = createRequire(import.meta.url)
const { getRootDirs } = require(path.join(path.dirname(require.resolve('@next/eslint-plugin-next')), 'utils/get-root-dirs.js'))

// The scoped tinyglobby override must preserve the lint plugin's directory-only glob behavior.
test('Next lint resolves root directories for strings, arrays, and the default cwd', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'skillshield-lint-'))
  try {
    for (const name of ['web', 'docs']) mkdirSync(path.join(root, name))
    writeFileSync(path.join(root, 'file.txt'), '')
    const pattern = path.join(root, '*')
    const expected = [path.join(root, 'docs'), path.join(root, 'web')].map(p => p.replace(/\\/g, '/')).sort()
    expect(getRootDirs({ cwd: root, settings: { next: { rootDir: pattern } } }).sort()).toEqual(expected)
    expect(getRootDirs({ cwd: root, settings: { next: { rootDir: [pattern, 1] } } }).sort()).toEqual(expected)
    expect(getRootDirs({ cwd: root, settings: { next: { rootDir: path.join(root, '{docs,web}') } } }).sort()).toEqual(expected)
    expect(getRootDirs({ cwd: root, settings: { next: { rootDir: 'packages/lint-glob-*' } } })).toEqual(['packages/lint-glob-compat'])
    expect(getRootDirs({ cwd: root, settings: {} })).toEqual([root])
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
